"""Recovery engine for Domino Sky flight disruption simulator.

Evaluates and applies tactical recovery interventions (flight cancellations and
spare aircraft substitutions), verifies operational feasibility, and ranks candidate
strategies using multi-objective aviation dispatch criteria.
"""

from typing import Dict, List, Optional, Tuple
from data_loader import DataLoader
from models import (
    Flight,
    RecoveryAction,
    RecoveryActionType,
    RecoveryEvaluateResponse,
    SimulationMetrics,
    SimulationResult,
    SpareAircraft,
)
from simulation.disruption_engine import run_simulation
from simulation.time_engine import time_to_minutes

DISCLAIMER_TEXT = "Crew availability and aircraft-specific operational compatibility are not independently verified"


def check_spare_substitution_feasibility(
    target_flight: Flight,
    spare_aircraft: SpareAircraft,
) -> Tuple[bool, Optional[str]]:
    """Verify whether a spare aircraft substitution satisfies geographical and timing constraints."""
    if spare_aircraft.base != target_flight.origin:
        return (
            False,
            f"Spare aircraft {spare_aircraft.tail_id} is stationed at {spare_aircraft.base}, "
            f"but flight {target_flight.flight_id} departs from {target_flight.origin}."
        )

    avail_mins = time_to_minutes(spare_aircraft.available_from)
    sched_dep_mins = time_to_minutes(target_flight.dep)
    if sched_dep_mins < avail_mins:
        return (
            False,
            f"Spare aircraft {spare_aircraft.tail_id} is only available from {spare_aircraft.available_from}, "
            f"which is after flight {target_flight.flight_id} scheduled departure {target_flight.dep}."
        )

    return True, None


def evaluate_recovery_action(
    data_loader: DataLoader,
    current_result: SimulationResult,
    action: RecoveryAction,
    airport_id: Optional[str] = None,
    closure_start: Optional[str] = None,
    closure_duration_minutes: Optional[int] = None,
    existing_actions: Optional[List[RecoveryAction]] = None,
) -> RecoveryEvaluateResponse:
    """Evaluate a recovery action against the current simulated state."""
    existing_actions = list(existing_actions or [])
    target_f = data_loader.get_flight(action.target_flight_id)

    if not target_f:
        return RecoveryEvaluateResponse(
            scenario_id=current_result.scenario_id,
            is_feasible=False,
            infeasibility_reason=f"Flight {action.target_flight_id} does not exist in network schedule.",
            action_type=action.action_type,
            target_flight_id=action.target_flight_id,
            spare_tail_id=action.spare_tail_id,
            before_metrics=current_result.metrics,
            after_metrics=current_result.metrics,
            improvement={},
            disclaimer=DISCLAIMER_TEXT,
            explanation=f"Cannot evaluate non-existent flight {action.target_flight_id}.",
            simulation_result=None,
        )

    # Feasibility validation
    if action.action_type == RecoveryActionType.SUBSTITUTE_AIRCRAFT:
        if not action.spare_tail_id:
            return RecoveryEvaluateResponse(
                scenario_id=current_result.scenario_id,
                is_feasible=False,
                infeasibility_reason="Spare aircraft tail ID must be specified for substitution.",
                action_type=action.action_type,
                target_flight_id=action.target_flight_id,
                spare_tail_id=None,
                before_metrics=current_result.metrics,
                after_metrics=current_result.metrics,
                improvement={},
                disclaimer=DISCLAIMER_TEXT,
                explanation="No spare aircraft selected.",
                simulation_result=None,
            )

        spare = data_loader.spare_aircraft_map.get(action.spare_tail_id)
        if not spare:
            return RecoveryEvaluateResponse(
                scenario_id=current_result.scenario_id,
                is_feasible=False,
                infeasibility_reason=f"Spare aircraft '{action.spare_tail_id}' does not exist in fleet inventory.",
                action_type=action.action_type,
                target_flight_id=action.target_flight_id,
                spare_tail_id=action.spare_tail_id,
                before_metrics=current_result.metrics,
                after_metrics=current_result.metrics,
                improvement={},
                disclaimer=DISCLAIMER_TEXT,
                explanation=f"Spare tail {action.spare_tail_id} not recognized.",
                simulation_result=None,
            )

        is_feasible, reason = check_spare_substitution_feasibility(target_f, spare)
        if not is_feasible:
            return RecoveryEvaluateResponse(
                scenario_id=current_result.scenario_id,
                is_feasible=False,
                infeasibility_reason=reason,
                action_type=action.action_type,
                target_flight_id=action.target_flight_id,
                spare_tail_id=action.spare_tail_id,
                before_metrics=current_result.metrics,
                after_metrics=current_result.metrics,
                improvement={},
                disclaimer=DISCLAIMER_TEXT,
                explanation=reason or "Infeasible substitution.",
                simulation_result=None,
            )

    # Build simulated action set
    candidate_actions = existing_actions + [action]

    # Run simulation with new candidate action
    sim_after = run_simulation(
        data_loader=data_loader,
        airport_id=airport_id or current_result.airport_id,
        closure_start=closure_start or current_result.closure_start,
        closure_duration_minutes=closure_duration_minutes or current_result.closure_duration_minutes,
        scenario_id=current_result.scenario_id,
        scenario_name=f"{current_result.scenario_name} + Recovery",
        recovery_actions=candidate_actions,
    )

    before_m = current_result.metrics
    after_m = sim_after.metrics

    delay_saved = before_m.total_delay_minutes - after_m.total_delay_minutes
    crew_saved = before_m.crew_violations - after_m.crew_violations
    conn_saved = before_m.missed_connection_passengers - after_m.missed_connection_passengers
    cancels_delta = after_m.cancelled_flights - before_m.cancelled_flights

    improvement = {
        "delay_saved_minutes": delay_saved,
        "crew_violations_saved": crew_saved,
        "missed_connections_saved": conn_saved,
        "cancellations_delta": cancels_delta,
    }

    if action.action_type == RecoveryActionType.SUBSTITUTE_AIRCRAFT:
        explanation = (
            f"Substituted spare {action.spare_tail_id} on {action.target_flight_id} ({target_f.origin}->{target_f.destination}). "
            f"Saved {delay_saved}m delay, resolved {crew_saved} crew violations, "
            f"and protected {conn_saved} connecting passengers."
        )
    else:
        explanation = (
            f"Cancelled flight {action.target_flight_id} ({target_f.origin}->{target_f.destination}). "
            f"Grounding aircraft at {target_f.origin} saves {delay_saved}m downstream delay "
            f"and {crew_saved} crew violations (added {cancels_delta} cancellation)."
        )

    return RecoveryEvaluateResponse(
        scenario_id=current_result.scenario_id,
        is_feasible=True,
        infeasibility_reason=None,
        action_type=action.action_type,
        target_flight_id=action.target_flight_id,
        spare_tail_id=action.spare_tail_id,
        before_metrics=before_m,
        after_metrics=after_m,
        improvement=improvement,
        disclaimer=DISCLAIMER_TEXT,
        explanation=explanation,
        simulation_result=sim_after,
    )


def rank_recovery_candidates(
    evaluations: List[RecoveryEvaluateResponse],
) -> List[RecoveryEvaluateResponse]:
    """Rank evaluated recovery strategies according to official dispatch priorities:

    1) avoid crew violations (minimize after.crew_violations)
    2) minimize missed connections (minimize after.missed_connection_passengers)
    3) minimize cancellations (minimize after.cancelled_flights)
    4) minimize total delay (minimize after.total_delay_minutes)
    """
    feasible_evals = [e for e in evaluations if e.is_feasible]

    def ranking_key(item: RecoveryEvaluateResponse):
        m = item.after_metrics
        return (
            m.crew_violations,
            m.missed_connection_passengers,
            m.cancelled_flights,
            m.total_delay_minutes,
        )

    feasible_evals.sort(key=ranking_key)
    infeasible_evals = [e for e in evaluations if not e.is_feasible]
    return feasible_evals + infeasible_evals


def generate_recommendations(
    data_loader: DataLoader,
    current_result: SimulationResult,
    existing_actions: Optional[List[RecoveryAction]] = None,
) -> List[RecoveryEvaluateResponse]:
    """Automatically find, evaluate, and rank candidate recovery actions for the current disruption."""
    existing_actions = existing_actions or []
    applied_fids = {a.target_flight_id for a in existing_actions}
    candidates: List[RecoveryAction] = []

    # 1. Candidate Spare Substitutions
    # Spare VT-DS17 @ BLR, VT-DS18 @ DEL
    for spare_tail, spare in data_loader.spare_aircraft_map.items():
        # Find delayed flights originating at spare base
        for fl_res in current_result.affected_flights:
            if fl_res.flight_id in applied_fids or fl_res.is_cancelled:
                continue
            if fl_res.origin == spare.base and fl_res.delay_minutes > 0:
                candidates.append(
                    RecoveryAction(
                        action_type=RecoveryActionType.SUBSTITUTE_AIRCRAFT,
                        target_flight_id=fl_res.flight_id,
                        spare_tail_id=spare_tail,
                        description=f"Deploy spare {spare_tail} at {spare.base} for flight {fl_res.flight_id}",
                    )
                )

    # 2. Candidate Flight Cancellations
    # Test cancelling key delayed flights that cause large downstream cascades or crew violations
    for fl_res in current_result.affected_flights:
        if fl_res.flight_id in applied_fids or fl_res.is_cancelled:
            continue
        if fl_res.delay_minutes >= 30:
            candidates.append(
                RecoveryAction(
                    action_type=RecoveryActionType.CANCEL_FLIGHT,
                    target_flight_id=fl_res.flight_id,
                    description=f"Cancel flight {fl_res.flight_id} ({fl_res.origin}->{fl_res.destination})",
                )
            )

    evaluations: List[RecoveryEvaluateResponse] = []
    for cand in candidates:
        eval_resp = evaluate_recovery_action(
            data_loader=data_loader,
            current_result=current_result,
            action=cand,
            existing_actions=existing_actions,
        )
        if eval_resp.is_feasible:
            evaluations.append(eval_resp)

    return rank_recovery_candidates(evaluations)
