"""Aircraft rotation engine for Domino Sky flight disruption simulator.

Calculates deterministic flight departure and arrival times across aircraft rotations,
incorporating turnarounds, airport closures, ground holds, and recovery interventions.
"""

from typing import Dict, List, Optional, Set, Tuple
from models import (
    DelayCauseType,
    Flight,
    FlightResult,
    FlightStatus,
    RecoveryAction,
    RecoveryActionType,
    SpareAircraft,
)
from simulation.time_engine import (
    calculate_delay,
    is_in_closure_window,
    minutes_to_time,
    time_to_minutes,
)


def simulate_aircraft_rotations(
    flights: List[Flight],
    min_turnaround_mins: int = 30,
    closure_airport: Optional[str] = None,
    closure_start_mins: Optional[int] = None,
    closure_end_mins: Optional[int] = None,
    recovery_actions: Optional[List[RecoveryAction]] = None,
    spare_aircraft_map: Optional[Dict[str, SpareAircraft]] = None,
) -> Tuple[List[FlightResult], Dict[str, List[str]]]:
    """Execute deterministic rotation simulation across all aircraft fleets.

    Returns:
        Tuple of (flight_results_list, delay_chains_dict)
    """
    recovery_actions = recovery_actions or []
    cancelled_flight_ids: Set[str] = set()
    spare_substitutions: Dict[str, str] = {}  # target_flight_id -> spare_tail_id

    for act in recovery_actions:
        if act.action_type == RecoveryActionType.CANCEL_FLIGHT:
            cancelled_flight_ids.add(act.target_flight_id)
        elif act.action_type == RecoveryActionType.SUBSTITUTE_AIRCRAFT and act.spare_tail_id:
            spare_substitutions[act.target_flight_id] = act.spare_tail_id

    # Group flights by aircraft tail
    tail_flights: Dict[str, List[Flight]] = {}
    for fl in flights:
        tail_flights.setdefault(fl.tail_id, []).append(fl)

    # Sort each aircraft's flights strictly by leg_order
    for tail_id in tail_flights:
        tail_flights[tail_id].sort(key=lambda f: f.leg_order)

    flight_results: List[FlightResult] = []
    flight_result_map: Dict[str, FlightResult] = {}
    delay_chains: Dict[str, List[str]] = {}

    has_closure = (
        closure_airport is not None
        and closure_start_mins is not None
        and closure_end_mins is not None
    )

    # Track spare aircraft state: current_airport, available_time_mins
    spare_states: Dict[str, Dict[str, any]] = {}
    if spare_aircraft_map:
        for stail, sp in spare_aircraft_map.items():
            spare_states[stail] = {
                "base": sp.base,
                "current_airport": sp.base,
                "available_mins": time_to_minutes(sp.available_from),
                "tail_id": stail,
            }

    # Process aircraft rotations
    for original_tail_id, legs in tail_flights.items():
        prev_actual_arr_mins: Optional[int] = None
        prev_actual_dest: Optional[str] = None
        prev_flight_id: Optional[str] = None
        active_spare_tail: Optional[str] = None

        # Base location of aircraft at start of day is origin of leg 1
        current_ac_location = legs[0].origin if legs else None

        for leg in legs:
            fid = leg.flight_id
            sched_dep_mins = time_to_minutes(leg.dep)
            sched_arr_mins = time_to_minutes(leg.arr)
            block_mins = leg.block_minutes

            # Check if this leg triggers a spare substitution
            if fid in spare_substitutions:
                active_spare_tail = spare_substitutions[fid]

            effective_tail = active_spare_tail if active_spare_tail else original_tail_id

            # Check explicit cancellation
            if fid in cancelled_flight_ids:
                res = FlightResult(
                    flight_id=fid,
                    tail_id=effective_tail,
                    original_tail_id=original_tail_id,
                    leg_order=leg.leg_order,
                    origin=leg.origin,
                    destination=leg.destination,
                    scheduled_departure=leg.dep,
                    scheduled_arrival=leg.arr,
                    actual_departure=None,
                    actual_arrival=None,
                    scheduled_dep_mins=sched_dep_mins,
                    scheduled_arr_mins=sched_arr_mins,
                    actual_dep_mins=None,
                    actual_arr_mins=None,
                    block_minutes=block_mins,
                    delay_minutes=0,
                    departure_delay_minutes=0,
                    arrival_delay_minutes=0,
                    status=FlightStatus.CANCELLED,
                    is_cancelled=True,
                    primary_cause=DelayCauseType.RECOVERY_ACTION,
                    caused_by_flight_id=None,
                    cause_chain=["RECOVERY_ACTION (Flight cancelled by dispatcher)"],
                    explanation=f"Flight {fid} was cancelled as a recovery intervention.",
                    pax=leg.pax,
                    turnaround_before_min=leg.turnaround_before_min,
                )
                flight_results.append(res)
                flight_result_map[fid] = res
                delay_chains[fid] = res.cause_chain
                # Aircraft remains at last known location (current_ac_location unchanged)
                # It does not fly this leg
                prev_flight_id = fid
                prev_actual_arr_mins = None
                continue

            # Check aircraft positioning feasibility
            # If previous leg was cancelled or aircraft is not at this leg's origin
            if active_spare_tail:
                sp_info = spare_states.get(active_spare_tail, {})
                sp_loc = sp_info.get("current_airport")
                if sp_loc and sp_loc != leg.origin:
                    # Spare is not at origin
                    res = FlightResult(
                        flight_id=fid,
                        tail_id=effective_tail,
                        original_tail_id=original_tail_id,
                        leg_order=leg.leg_order,
                        origin=leg.origin,
                        destination=leg.destination,
                        scheduled_departure=leg.dep,
                        scheduled_arrival=leg.arr,
                        actual_departure=None,
                        actual_arrival=None,
                        scheduled_dep_mins=sched_dep_mins,
                        scheduled_arr_mins=sched_arr_mins,
                        actual_dep_mins=None,
                        actual_arr_mins=None,
                        block_minutes=block_mins,
                        delay_minutes=0,
                        status=FlightStatus.CANCELLED,
                        is_cancelled=True,
                        primary_cause=DelayCauseType.AIRCRAFT_UNAVAILABLE,
                        caused_by_flight_id=prev_flight_id,
                        cause_chain=["AIRCRAFT_UNAVAILABLE (Spare aircraft not at departure airport)"],
                        explanation=f"Spare aircraft {effective_tail} is at {sp_loc}, not at origin {leg.origin}.",
                        pax=leg.pax,
                        turnaround_before_min=leg.turnaround_before_min,
                    )
                    flight_results.append(res)
                    flight_result_map[fid] = res
                    delay_chains[fid] = res.cause_chain
                    prev_flight_id = fid
                    prev_actual_arr_mins = None
                    continue
            else:
                if current_ac_location and current_ac_location != leg.origin:
                    # Original aircraft not at origin because previous leg was cancelled or diverted
                    res = FlightResult(
                        flight_id=fid,
                        tail_id=effective_tail,
                        original_tail_id=original_tail_id,
                        leg_order=leg.leg_order,
                        origin=leg.origin,
                        destination=leg.destination,
                        scheduled_departure=leg.dep,
                        scheduled_arrival=leg.arr,
                        actual_departure=None,
                        actual_arrival=None,
                        scheduled_dep_mins=sched_dep_mins,
                        scheduled_arr_mins=sched_arr_mins,
                        actual_dep_mins=None,
                        actual_arr_mins=None,
                        block_minutes=block_mins,
                        delay_minutes=0,
                        status=FlightStatus.CANCELLED,
                        is_cancelled=True,
                        primary_cause=DelayCauseType.AIRCRAFT_UNAVAILABLE,
                        caused_by_flight_id=prev_flight_id,
                        cause_chain=[
                            f"PREVIOUS_FLIGHT_CANCELLED ({prev_flight_id})",
                            f"AIRCRAFT_UNAVAILABLE (Aircraft {effective_tail} stranded at {current_ac_location})",
                        ],
                        explanation=f"Aircraft {effective_tail} is at {current_ac_location}, cannot operate {fid} from {leg.origin}.",
                        pax=leg.pax,
                        turnaround_before_min=leg.turnaround_before_min,
                    )
                    flight_results.append(res)
                    flight_result_map[fid] = res
                    delay_chains[fid] = res.cause_chain
                    prev_flight_id = fid
                    prev_actual_arr_mins = None
                    continue

            # Calculate actual departure readiness
            # For substituted spare aircraft on its first substituted leg
            if fid in spare_substitutions:
                sp_info = spare_states.get(effective_tail, {})
                sp_ready = sp_info.get("available_mins", sched_dep_mins)
                dep_ready_mins = max(sched_dep_mins, sp_ready)
                inbound_delay_chain: List[str] = [f"RECOVERY_ACTION (Spare {effective_tail} substituted)"]
            elif prev_actual_arr_mins is not None:
                # Normal turnaround from previous leg
                turnaround_ready = prev_actual_arr_mins + min_turnaround_mins
                dep_ready_mins = max(sched_dep_mins, turnaround_ready)
                prev_res = flight_result_map.get(prev_flight_id) if prev_flight_id else None
                inbound_delay_chain = list(prev_res.cause_chain) if prev_res else []
            else:
                dep_ready_mins = sched_dep_mins
                inbound_delay_chain = []

            # Apply airport closure constraints
            actual_dep_mins = dep_ready_mins
            cause_chain: List[str] = list(inbound_delay_chain)
            primary_cause = DelayCauseType.NONE
            caused_by_flight: Optional[str] = None

            turnaround_delay = max(0, dep_ready_mins - sched_dep_mins)
            if turnaround_delay > 0 and prev_flight_id:
                caused_by_flight = prev_flight_id
                primary_cause = DelayCauseType.AIRCRAFT_TURNAROUND
                prev_f_res = flight_result_map.get(prev_flight_id)
                prev_delay_m = prev_f_res.delay_minutes if prev_f_res else 0
                chain_entry = f"PREVIOUS_FLIGHT_DELAY ({prev_flight_id} +{prev_delay_m}m) -> AIRCRAFT_TURNAROUND ({effective_tail})"
                if chain_entry not in cause_chain:
                    cause_chain.append(chain_entry)

            # 1. Origin closure check
            if has_closure and leg.origin == closure_airport:
                if is_in_closure_window(actual_dep_mins, closure_start_mins, closure_end_mins):
                    # Held until airport opens
                    actual_dep_mins = max(actual_dep_mins, closure_end_mins)
                    primary_cause = DelayCauseType.AIRPORT_CLOSURE
                    cause_chain.append(
                        f"AIRPORT_CLOSURE (Origin {closure_airport} closed {minutes_to_time(closure_start_mins)}-{minutes_to_time(closure_end_mins)})"
                    )

            # 2. Destination closure check
            tentative_arr_mins = actual_dep_mins + block_mins
            if has_closure and leg.destination == closure_airport:
                if is_in_closure_window(tentative_arr_mins, closure_start_mins, closure_end_mins):
                    # Hold departure until destination opens:
                    # arrival must be >= closure_end_mins, so departure >= closure_end_mins - block_mins
                    hold_dep_mins = closure_end_mins - block_mins
                    if hold_dep_mins > actual_dep_mins:
                        actual_dep_mins = hold_dep_mins
                        primary_cause = DelayCauseType.AIRPORT_CLOSURE
                        cause_chain.append(
                            f"AIRPORT_CLOSURE (Destination {closure_airport} closed {minutes_to_time(closure_start_mins)}-{minutes_to_time(closure_end_mins)}; ground hold at {leg.origin})"
                        )

            # Final arrival time
            actual_arr_mins = actual_dep_mins + block_mins
            delay_minutes = calculate_delay(sched_dep_mins, actual_dep_mins)
            dep_delay_minutes = delay_minutes
            arr_delay_minutes = calculate_delay(sched_arr_mins, actual_arr_mins)

            status = FlightStatus.ON_TIME if delay_minutes == 0 else FlightStatus.DELAYED

            if status == FlightStatus.ON_TIME:
                primary_cause = DelayCauseType.NONE
                cause_chain = []
                explanation = "Operating on schedule."
            else:
                if primary_cause == DelayCauseType.AIRPORT_CLOSURE:
                    if leg.origin == closure_airport:
                        explanation = (
                            f"Held at {leg.origin} by {delay_minutes} mins due to origin airport closure "
                            f"until {minutes_to_time(closure_end_mins)}."
                        )
                    else:
                        explanation = (
                            f"Held at {leg.origin} by {delay_minutes} mins because destination {closure_airport} "
                            f"is closed until {minutes_to_time(closure_end_mins)}."
                        )
                elif primary_cause == DelayCauseType.AIRCRAFT_TURNAROUND:
                    explanation = (
                        f"Delayed by {delay_minutes} mins awaiting late incoming aircraft {effective_tail} "
                        f"from flight {prev_flight_id} (arrived {minutes_to_time(prev_actual_arr_mins)})."
                    )
                else:
                    explanation = f"Delayed by {delay_minutes} minutes."

            res = FlightResult(
                flight_id=fid,
                tail_id=effective_tail,
                original_tail_id=original_tail_id,
                leg_order=leg.leg_order,
                origin=leg.origin,
                destination=leg.destination,
                scheduled_departure=leg.dep,
                scheduled_arrival=leg.arr,
                actual_departure=minutes_to_time(actual_dep_mins),
                actual_arrival=minutes_to_time(actual_arr_mins),
                scheduled_dep_mins=sched_dep_mins,
                scheduled_arr_mins=sched_arr_mins,
                actual_dep_mins=actual_dep_mins,
                actual_arr_mins=actual_arr_mins,
                block_minutes=block_mins,
                delay_minutes=delay_minutes,
                departure_delay_minutes=dep_delay_minutes,
                arrival_delay_minutes=arr_delay_minutes,
                status=status,
                is_cancelled=False,
                primary_cause=primary_cause,
                caused_by_flight_id=caused_by_flight,
                cause_chain=cause_chain,
                explanation=explanation,
                pax=leg.pax,
                turnaround_before_min=leg.turnaround_before_min,
            )
            flight_results.append(res)
            flight_result_map[fid] = res
            delay_chains[fid] = cause_chain

            # Update rotation tracking
            prev_actual_arr_mins = actual_arr_mins
            prev_actual_dest = leg.destination
            prev_flight_id = fid
            current_ac_location = leg.destination

            # Update spare aircraft state if used
            if active_spare_tail and active_spare_tail in spare_states:
                spare_states[active_spare_tail]["current_airport"] = leg.destination
                spare_states[active_spare_tail]["available_mins"] = actual_arr_mins + min_turnaround_mins

    # Sort final flight results chronologically by scheduled departure, then flight_id
    flight_results.sort(key=lambda f: (f.scheduled_dep_mins, f.flight_id))
    return flight_results, delay_chains
