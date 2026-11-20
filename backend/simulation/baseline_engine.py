"""Baseline engine for computing Domino Sky initial undisturbed network state.

All flights operate exactly on schedule with 0 delay, establishing the benchmark
against which all disruptions and recovery actions are evaluated.
"""

from typing import Dict, List
from data_loader import DataLoader
from models import (
    ConnectionStatus,
    CrewDutyResult,
    DelayCauseType,
    FlightResult,
    FlightStatus,
    MissedConnection,
    SimulationMetrics,
    SimulationResult,
    TimelineEvent,
)
from simulation.time_engine import minutes_to_time, time_to_minutes


def compute_baseline(data_loader: DataLoader) -> SimulationResult:
    """Compute the baseline network state where all flights operate on schedule."""
    flights = sorted(data_loader.flights, key=lambda f: (time_to_minutes(f.dep), f.flight_id))
    flight_results: List[FlightResult] = []
    flight_result_map: Dict[str, FlightResult] = {}
    timeline_events: List[TimelineEvent] = []

    for fl in flights:
        dep_mins = time_to_minutes(fl.dep)
        arr_mins = time_to_minutes(fl.arr)
        res = FlightResult(
            flight_id=fl.flight_id,
            tail_id=fl.tail_id,
            original_tail_id=fl.tail_id,
            leg_order=fl.leg_order,
            origin=fl.origin,
            destination=fl.destination,
            scheduled_departure=fl.dep,
            scheduled_arrival=fl.arr,
            actual_departure=fl.dep,
            actual_arrival=fl.arr,
            scheduled_dep_mins=dep_mins,
            scheduled_arr_mins=arr_mins,
            actual_dep_mins=dep_mins,
            actual_arr_mins=arr_mins,
            block_minutes=fl.block_minutes,
            delay_minutes=0,
            departure_delay_minutes=0,
            arrival_delay_minutes=0,
            status=FlightStatus.ON_TIME,
            is_cancelled=False,
            primary_cause=DelayCauseType.NONE,
            caused_by_flight_id=None,
            cause_chain=[],
            explanation="Operating on schedule.",
            pax=fl.pax,
            turnaround_before_min=fl.turnaround_before_min,
        )
        flight_results.append(res)
        flight_result_map[fl.flight_id] = res

        timeline_events.append(
            TimelineEvent(
                time=fl.dep,
                time_mins=dep_mins,
                event_type="DEPARTURE",
                flight_id=fl.flight_id,
                airport_id=fl.origin,
                description=f"Flight {fl.flight_id} ({fl.tail_id}) departs {fl.origin} for {fl.destination} on time",
                details={"flight_id": fl.flight_id, "tail_id": fl.tail_id, "origin": fl.origin, "dep": fl.dep},
            )
        )
        timeline_events.append(
            TimelineEvent(
                time=fl.arr,
                time_mins=arr_mins,
                event_type="ARRIVAL",
                flight_id=fl.flight_id,
                airport_id=fl.destination,
                description=f"Flight {fl.flight_id} ({fl.tail_id}) arrives {fl.destination} on time",
                details={"flight_id": fl.flight_id, "tail_id": fl.tail_id, "destination": fl.destination, "arr": fl.arr},
            )
        )

    # Connections
    connections = data_loader.connections
    missed_connections: List[MissedConnection] = []
    missed_pax_count = 0

    for cx in connections:
        from_f = flight_result_map.get(cx.from_flight)
        to_f = flight_result_map.get(cx.to_flight)
        if not from_f or not to_f:
            continue

        sched_slack = to_f.scheduled_dep_mins - from_f.scheduled_arr_mins
        actual_slack = to_f.actual_dep_mins - from_f.actual_arr_mins if (to_f.actual_dep_mins and from_f.actual_arr_mins) else None

        is_missed = actual_slack is None or actual_slack < cx.min_connect_minutes
        if is_missed:
            missed_pax_count += cx.passengers

        missed_connections.append(
            MissedConnection(
                connection_id=cx.connection_id,
                airport=cx.airport,
                from_flight=cx.from_flight,
                to_flight=cx.to_flight,
                passengers=cx.passengers,
                min_connect_minutes=cx.min_connect_minutes,
                scheduled_slack_minutes=sched_slack,
                actual_slack_minutes=actual_slack,
                status=ConnectionStatus.MISSED if is_missed else ConnectionStatus.MAINTAINED,
                is_missed=is_missed,
                reason="Transfer time adequate on baseline schedule." if not is_missed else "Insufficient transfer time.",
            )
        )

    # Crews
    crews = data_loader.crews
    crew_results: List[CrewDutyResult] = []
    crew_violations_count = 0

    for cr in crews:
        duty_start_mins = time_to_minutes(cr.duty_start)
        last_fid = cr.flight_ids[-1] if cr.flight_ids else None
        last_f = flight_result_map.get(last_fid) if last_fid else None

        if last_f and last_f.actual_arr_mins is not None:
            actual_duty = last_f.actual_arr_mins - duty_start_mins
            sched_duty = last_f.scheduled_arr_mins - duty_start_mins
            actual_arr_str = last_f.actual_arrival
            sched_arr_str = last_f.scheduled_arrival
        else:
            actual_duty = 0
            sched_duty = 0
            actual_arr_str = None
            sched_arr_str = "00:00"

        violation = actual_duty > cr.max_duty_mins
        overtime = max(0, actual_duty - cr.max_duty_mins)
        slack = cr.max_duty_mins - actual_duty

        if violation:
            crew_violations_count += 1

        crew_results.append(
            CrewDutyResult(
                crew_id=cr.crew_id,
                tail_id=cr.tail_id,
                base=cr.base,
                duty_start=cr.duty_start,
                duty_start_mins=duty_start_mins,
                max_duty_mins=cr.max_duty_mins,
                scheduled_duty_mins=sched_duty,
                actual_duty_mins=actual_duty,
                slack_mins=slack,
                overtime_mins=overtime,
                violation=violation,
                last_flight_id=last_fid,
                scheduled_last_flight_arr=sched_arr_str,
                actual_last_flight_arr=actual_arr_str,
                flight_ids=cr.flight_ids,
                reason="Within legal duty limits." if not violation else f"Exceeded maximum duty by {overtime} minutes.",
            )
        )

    timeline_events.sort(key=lambda e: (e.time_mins, 0 if e.event_type == "ARRIVAL" else 1))

    metrics = SimulationMetrics(
        delayed_count=0,
        total_delay_minutes=0,
        missed_connection_passengers=missed_pax_count,
        cancelled_flights=0,
        crew_violations=crew_violations_count,
        on_time_count=len(flight_results),
        average_delay_minutes=0.0,
    )

    return SimulationResult(
        scenario_id="baseline",
        scenario_name="Baseline Schedule",
        airport_id=None,
        closure_start=None,
        closure_duration_minutes=None,
        closure_end=None,
        affected_flights=flight_results,
        missed_connections=missed_connections,
        crew_status=crew_results,
        metrics=metrics,
        delay_chain={},
        timeline_events=timeline_events,
        summary="Baseline schedule with zero disruptions. All flights operating on time.",
    )
