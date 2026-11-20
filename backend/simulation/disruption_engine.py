"""Disruption engine coordinating airport closure impacts and cascade propagation.

Assembles aircraft rotations, passenger connection evaluations, crew duty checks,
and generates chronological timeline events and summary metrics.
"""

from typing import Dict, List, Optional
from data_loader import DataLoader
from models import (
    FlightResult,
    RecoveryAction,
    SimulationMetrics,
    SimulationResult,
    TimelineEvent,
)
from simulation.aircraft_engine import simulate_aircraft_rotations
from simulation.crew_engine import evaluate_crews
from simulation.passenger_engine import evaluate_connections
from simulation.time_engine import (
    compute_closure_window,
    minutes_to_time,
    time_to_minutes,
)


def run_simulation(
    data_loader: DataLoader,
    airport_id: Optional[str] = None,
    closure_start: Optional[str] = None,
    closure_duration_minutes: Optional[int] = None,
    scenario_id: str = "sim_default",
    scenario_name: str = "Airport Closure Simulation",
    recovery_actions: Optional[List[RecoveryAction]] = None,
) -> SimulationResult:
    """Run a complete deterministic disruption simulation."""
    closure_start_mins: Optional[int] = None
    closure_end_mins: Optional[int] = None
    closure_end_str: Optional[str] = None

    if airport_id and closure_start and closure_duration_minutes is not None:
        closure_start_mins, closure_end_mins, closure_end_str = compute_closure_window(
            closure_start, closure_duration_minutes
        )

    # 1. Simulate aircraft rotations
    flight_results, delay_chains = simulate_aircraft_rotations(
        flights=data_loader.flights,
        min_turnaround_mins=data_loader.meta.min_turnaround_minutes,
        closure_airport=airport_id,
        closure_start_mins=closure_start_mins,
        closure_end_mins=closure_end_mins,
        recovery_actions=recovery_actions,
        spare_aircraft_map=data_loader.spare_aircraft_map,
    )
    flight_result_map: Dict[str, FlightResult] = {f.flight_id: f for f in flight_results}

    # 2. Evaluate passenger connections
    missed_connections, missed_pax = evaluate_connections(
        connections=data_loader.connections,
        flight_results_map=flight_result_map,
    )

    # 3. Evaluate crew duty limits
    crew_results, crew_violations = evaluate_crews(
        crews=data_loader.crews,
        flight_results_map=flight_result_map,
    )

    # 4. Generate chronological timeline events
    timeline_events: List[TimelineEvent] = []

    if airport_id and closure_start_mins is not None and closure_end_mins is not None:
        timeline_events.append(
            TimelineEvent(
                time=closure_start,
                time_mins=closure_start_mins,
                event_type="AIRPORT_CLOSED",
                airport_id=airport_id,
                description=f"Airport {airport_id} closed for {closure_duration_minutes} minutes until {closure_end_str}.",
                details={"airport_id": airport_id, "start": closure_start, "end": closure_end_str},
            )
        )
        timeline_events.append(
            TimelineEvent(
                time=closure_end_str,
                time_mins=closure_end_mins,
                event_type="AIRPORT_OPENED",
                airport_id=airport_id,
                description=f"Airport {airport_id} reopened for flight operations.",
                details={"airport_id": airport_id, "reopened_at": closure_end_str},
            )
        )

    for f in flight_results:
        if f.is_cancelled:
            timeline_events.append(
                TimelineEvent(
                    time=f.scheduled_departure,
                    time_mins=f.scheduled_dep_mins,
                    event_type="CANCELLATION",
                    flight_id=f.flight_id,
                    airport_id=f.origin,
                    description=f"Flight {f.flight_id} ({f.origin}->{f.destination}) CANCELLED: {f.explanation}",
                    details={"flight_id": f.flight_id, "reason": f.explanation},
                )
            )
        else:
            dep_time_desc = (
                f"Flight {f.flight_id} departs {f.origin} on time"
                if f.delay_minutes == 0
                else f"Flight {f.flight_id} departs {f.origin} DELAYED by {f.delay_minutes}m ({f.explanation})"
            )
            timeline_events.append(
                TimelineEvent(
                    time=f.actual_departure or f.scheduled_departure,
                    time_mins=f.actual_dep_mins or f.scheduled_dep_mins,
                    event_type="DEPARTURE",
                    flight_id=f.flight_id,
                    airport_id=f.origin,
                    description=dep_time_desc,
                    details={"flight_id": f.flight_id, "delay": f.delay_minutes, "cause": f.primary_cause},
                )
            )
            arr_time_desc = (
                f"Flight {f.flight_id} arrives {f.destination} on time"
                if f.arrival_delay_minutes == 0
                else f"Flight {f.flight_id} arrives {f.destination} DELAYED by {f.arrival_delay_minutes}m"
            )
            timeline_events.append(
                TimelineEvent(
                    time=f.actual_arrival or f.scheduled_arrival,
                    time_mins=f.actual_arr_mins or f.scheduled_arr_mins,
                    event_type="ARRIVAL",
                    flight_id=f.flight_id,
                    airport_id=f.destination,
                    description=arr_time_desc,
                    details={"flight_id": f.flight_id, "delay": f.arrival_delay_minutes},
                )
            )

    for mc in missed_connections:
        if mc.is_missed:
            from_f = flight_result_map.get(mc.from_flight)
            arr_time = from_f.actual_arrival if (from_f and from_f.actual_arrival) else "00:00"
            arr_mins = from_f.actual_arr_mins if (from_f and from_f.actual_arr_mins) else 0
            timeline_events.append(
                TimelineEvent(
                    time=arr_time,
                    time_mins=arr_mins,
                    event_type="MISSED_CONNECTION",
                    flight_id=mc.from_flight,
                    airport_id=mc.airport,
                    description=f"Connection {mc.connection_id} missed at {mc.airport}: {mc.passengers} pax stranded ({mc.from_flight}->{mc.to_flight}).",
                    details={"connection_id": mc.connection_id, "passengers": mc.passengers, "reason": mc.reason},
                )
            )

    for cr in crew_results:
        if cr.violation:
            timeline_events.append(
                TimelineEvent(
                    time=cr.actual_last_flight_arr or "00:00",
                    time_mins=time_to_minutes(cr.actual_last_flight_arr or "00:00"),
                    event_type="CREW_VIOLATION",
                    airport_id=cr.base,
                    description=f"Crew {cr.crew_id} ({cr.tail_id}) exceeded legal duty: {cr.overtime_mins}m overtime.",
                    details={"crew_id": cr.crew_id, "overtime_mins": cr.overtime_mins},
                )
            )

    timeline_events.sort(key=lambda e: (e.time_mins, 0 if e.event_type in ["AIRPORT_CLOSED", "DEPARTURE"] else 1))

    # 5. Compute aggregate metrics
    delayed_flights = [f for f in flight_results if not f.is_cancelled and f.delay_minutes > 0]
    cancelled_count = sum(1 for f in flight_results if f.is_cancelled)
    on_time_count = sum(1 for f in flight_results if not f.is_cancelled and f.delay_minutes == 0)
    total_delay = sum(f.delay_minutes for f in delayed_flights)
    avg_delay = round(total_delay / len(delayed_flights), 2) if delayed_flights else 0.0

    metrics = SimulationMetrics(
        delayed_count=len(delayed_flights),
        total_delay_minutes=total_delay,
        missed_connection_passengers=missed_pax,
        cancelled_flights=cancelled_count,
        crew_violations=crew_violations,
        on_time_count=on_time_count,
        average_delay_minutes=avg_delay,
    )

    summary = (
        f"Closure of {airport_id or 'none'} caused {len(delayed_flights)} delayed flights "
        f"({total_delay} total mins), {missed_pax} stranded connecting passengers, "
        f"{cancelled_count} cancellations, and {crew_violations} crew duty violations."
    )

    return SimulationResult(
        scenario_id=scenario_id,
        scenario_name=scenario_name,
        airport_id=airport_id,
        closure_start=closure_start,
        closure_duration_minutes=closure_duration_minutes,
        closure_end=closure_end_str,
        affected_flights=flight_results,
        missed_connections=missed_connections,
        crew_status=crew_results,
        metrics=metrics,
        delay_chain=delay_chains,
        timeline_events=timeline_events,
        summary=summary,
    )
