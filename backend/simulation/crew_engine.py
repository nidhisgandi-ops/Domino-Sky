"""Crew duty engine for Domino Sky flight disruption simulator.

Calculates actual crew duty times, overtime hours, and legal maximum duty violations
(DGCA compliance rules) following flight delays and cancellations.
"""

from typing import Dict, List, Tuple
from models import (
    Crew,
    CrewDutyResult,
    FlightResult,
)
from simulation.time_engine import minutes_to_time, time_to_minutes


def evaluate_crews(
    crews: List[Crew],
    flight_results_map: Dict[str, FlightResult],
) -> Tuple[List[CrewDutyResult], int]:
    """Evaluate crew duty hours against legal maximum duty limits.

    Returns:
        Tuple of (crew_duty_results_list, violation_count)
    """
    results: List[CrewDutyResult] = []
    violations_count = 0

    for cr in crews:
        duty_start_mins = time_to_minutes(cr.duty_start)
        last_flight_id: str = cr.flight_ids[-1] if cr.flight_ids else ""
        last_f = flight_results_map.get(last_flight_id)

        sched_arr_mins = last_f.scheduled_arr_mins if last_f else duty_start_mins
        sched_duty_mins = max(0, sched_arr_mins - duty_start_mins)
        sched_arr_str = last_f.scheduled_arrival if last_f else cr.duty_start

        # Determine last operated flight in crew sequence
        effective_last_f: FlightResult = None
        for fid in reversed(cr.flight_ids):
            f_res = flight_results_map.get(fid)
            if f_res and not f_res.is_cancelled and f_res.actual_arr_mins is not None:
                effective_last_f = f_res
                break

        if effective_last_f:
            actual_arr_mins = effective_last_f.actual_arr_mins
            actual_arr_str = effective_last_f.actual_arrival
            actual_duty_mins = max(0, actual_arr_mins - duty_start_mins)
            active_last_fid = effective_last_f.flight_id
        else:
            # All flights cancelled or non-operated
            actual_arr_mins = duty_start_mins
            actual_arr_str = cr.duty_start
            actual_duty_mins = 0
            active_last_fid = None

        violation = actual_duty_mins > cr.max_duty_mins
        overtime_mins = max(0, actual_duty_mins - cr.max_duty_mins)
        slack_mins = cr.max_duty_mins - actual_duty_mins

        if violation:
            violations_count += 1
            reason = (
                f"Crew duty {actual_duty_mins}m exceeded legal limit {cr.max_duty_mins}m "
                f"by {overtime_mins}m following late arrival of {active_last_fid} at {actual_arr_str}."
            )
        else:
            reason = (
                f"Within legal duty limits ({actual_duty_mins}m / {cr.max_duty_mins}m max, "
                f"{slack_mins}m buffer remaining)."
            )

        results.append(
            CrewDutyResult(
                crew_id=cr.crew_id,
                tail_id=cr.tail_id,
                base=cr.base,
                duty_start=cr.duty_start,
                duty_start_mins=duty_start_mins,
                max_duty_mins=cr.max_duty_mins,
                scheduled_duty_mins=sched_duty_mins,
                actual_duty_mins=actual_duty_mins,
                slack_mins=slack_mins,
                overtime_mins=overtime_mins,
                violation=violation,
                last_flight_id=active_last_fid or last_flight_id,
                scheduled_last_flight_arr=sched_arr_str,
                actual_last_flight_arr=actual_arr_str,
                flight_ids=cr.flight_ids,
                reason=reason,
            )
        )

    # Sort results with violations first, then crew_id
    results.sort(key=lambda c: (0 if c.violation else 1, c.crew_id))
    return results, violations_count
