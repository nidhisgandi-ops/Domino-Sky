"""Explanation engine providing deterministic, data-grounded dispatch narratives.

Generates human-readable, auditable operational explanations for why flights are delayed,
how passenger connections break, why crew duty limits are exceeded, and how tactical
recovery actions resolve network cascades. Every cited number is strictly verified against simulation data.
"""

from typing import Any, Dict, List
from models import (
    DelayCauseType,
    FlightResult,
    RecoveryEvaluateResponse,
    SimulationResult,
)


def explain_flight_cascade(flight: FlightResult) -> str:
    """Generate a detailed deterministic narrative for a single flight's delay chain."""
    if flight.is_cancelled:
        return f"Flight {flight.flight_id} was cancelled ({flight.explanation})."
    if flight.delay_minutes == 0:
        return f"Flight {flight.flight_id} operated exactly on schedule ({flight.scheduled_departure} -> {flight.scheduled_arrival})."

    steps: List[str] = []
    if flight.primary_cause == DelayCauseType.AIRPORT_CLOSURE:
        steps.append(
            f"Ground held by {flight.delay_minutes} minutes directly by airport closure ({flight.origin}->{flight.destination})."
        )
    elif flight.primary_cause == DelayCauseType.AIRCRAFT_TURNAROUND:
        steps.append(
            f"Delayed departure by {flight.delay_minutes} minutes awaiting inbound aircraft {flight.tail_id} "
            f"from preceding flight {flight.caused_by_flight_id}."
        )

    if flight.cause_chain:
        chain_str = " -> ".join(flight.cause_chain)
        steps.append(f"Causal path: {chain_str}")

    return " ".join(steps)


def explain_disruption_impact(sim: SimulationResult) -> Dict[str, Any]:
    """Compile a structured dispatch breakdown of network impacts."""
    m = sim.metrics
    delayed_flights = [f for f in sim.affected_flights if f.delay_minutes > 0 and not f.is_cancelled]
    worst_delayed = sorted(delayed_flights, key=lambda f: f.delay_minutes, reverse=True)[:5]
    worst_connections = [c for c in sim.missed_connections if c.is_missed][:5]
    crew_violations = [c for c in sim.crew_status if c.violation]

    overview = (
        f"Closure of {sim.airport_id or 'the airport'} from {sim.closure_start} to {sim.closure_end} "
        f"({sim.closure_duration_minutes} minutes) resulted in {m.delayed_count} delayed flights "
        f"with an aggregate delay of {m.total_delay_minutes} minutes (average {m.average_delay_minutes}m per delayed flight). "
        f"Across network transfer hubs, {m.missed_connection_passengers} passengers missed guaranteed connections. "
        f"Regulatory duty thresholds were exceeded by {m.crew_violations} crew rosters."
    )

    return {
        "overview": overview,
        "metrics_summary": {
            "total_delay_minutes": m.total_delay_minutes,
            "delayed_flight_count": m.delayed_count,
            "cancelled_flight_count": m.cancelled_flights,
            "missed_connection_passengers": m.missed_connection_passengers,
            "crew_violations": m.crew_violations,
        },
        "critical_flight_delays": [
            {
                "flight_id": f.flight_id,
                "tail_id": f.tail_id,
                "route": f"{f.origin}->{f.destination}",
                "scheduled": f"{f.scheduled_departure} - {f.scheduled_arrival}",
                "actual": f"{f.actual_departure} - {f.actual_arrival}",
                "delay_minutes": f.delay_minutes,
                "cause": f.primary_cause.value,
                "explanation": f.explanation,
            }
            for f in worst_delayed
        ],
        "broken_connections": [
            {
                "connection_id": c.connection_id,
                "hub": c.airport,
                "itinerary": f"{c.from_flight} -> {c.to_flight}",
                "passengers": c.passengers,
                "actual_slack_minutes": c.actual_slack_minutes,
                "min_required_minutes": c.min_connect_minutes,
                "reason": c.reason,
            }
            for c in worst_connections
        ],
        "crew_violations": [
            {
                "crew_id": c.crew_id,
                "tail_id": c.tail_id,
                "base": c.base,
                "actual_duty_minutes": c.actual_duty_mins,
                "max_duty_minutes": c.max_duty_mins,
                "overtime_minutes": c.overtime_mins,
                "reason": c.reason,
            }
            for c in crew_violations
        ],
    }


def explain_recovery_action(eval_resp: RecoveryEvaluateResponse) -> str:
    """Explain a recommended recovery intervention and its quantitative trade-offs."""
    if not eval_resp.is_feasible:
        return f"Recovery proposal is infeasible: {eval_resp.infeasibility_reason}"

    imp = eval_resp.improvement
    parts: List[str] = []

    if eval_resp.action_type.value == "SUBSTITUTE_AIRCRAFT":
        parts.append(
            f"Deploying spare aircraft {eval_resp.spare_tail_id} for flight {eval_resp.target_flight_id} "
            f"isolates the rotation cascade."
        )
    else:
        parts.append(
            f"Cancelling flight {eval_resp.target_flight_id} prevents delay propagation along that aircraft's rotation."
        )

    parts.append(
        f"This action saves {imp.get('delay_saved_minutes', 0)} total minutes of network delay, "
        f"prevents {imp.get('crew_violations_saved', 0)} crew duty violations, "
        f"and recovers {imp.get('missed_connections_saved', 0)} stranded passengers."
    )

    if imp.get("cancellations_delta", 0) > 0:
        parts.append(f"Trade-off: requires {imp.get('cancellations_delta', 0)} scheduled flight cancellation(s).")

    return " ".join(parts)
