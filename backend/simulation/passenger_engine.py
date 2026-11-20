"""Passenger connection engine for Domino Sky flight disruption simulator.

Evaluates passenger connection feasibility across transfer hubs based on actual
flight timings, calculating slack buffers and stranded passenger counts.
"""

from typing import Dict, List, Tuple
from models import (
    Connection,
    ConnectionStatus,
    FlightResult,
    MissedConnection,
)


def evaluate_connections(
    connections: List[Connection],
    flight_results_map: Dict[str, FlightResult],
) -> Tuple[List[MissedConnection], int]:
    """Evaluate all passenger connections against actual flight execution times.

    Returns:
        Tuple of (connection_results_list, total_missed_passengers)
    """
    results: List[MissedConnection] = []
    total_missed_pax = 0

    for cx in connections:
        from_f = flight_results_map.get(cx.from_flight)
        to_f = flight_results_map.get(cx.to_flight)

        if not from_f or not to_f:
            continue

        sched_slack = to_f.scheduled_dep_mins - from_f.scheduled_arr_mins

        # If either flight was cancelled
        if from_f.is_cancelled:
            results.append(
                MissedConnection(
                    connection_id=cx.connection_id,
                    airport=cx.airport,
                    from_flight=cx.from_flight,
                    to_flight=cx.to_flight,
                    passengers=cx.passengers,
                    min_connect_minutes=cx.min_connect_minutes,
                    scheduled_slack_minutes=sched_slack,
                    actual_slack_minutes=None,
                    status=ConnectionStatus.MISSED,
                    is_missed=True,
                    reason=f"Inbound flight {cx.from_flight} was cancelled.",
                )
            )
            total_missed_pax += cx.passengers
            continue

        if to_f.is_cancelled:
            results.append(
                MissedConnection(
                    connection_id=cx.connection_id,
                    airport=cx.airport,
                    from_flight=cx.from_flight,
                    to_flight=cx.to_flight,
                    passengers=cx.passengers,
                    min_connect_minutes=cx.min_connect_minutes,
                    scheduled_slack_minutes=sched_slack,
                    actual_slack_minutes=None,
                    status=ConnectionStatus.MISSED,
                    is_missed=True,
                    reason=f"Connecting outbound flight {cx.to_flight} was cancelled.",
                )
            )
            total_missed_pax += cx.passengers
            continue

        # Both flights operated
        actual_slack = to_f.actual_dep_mins - from_f.actual_arr_mins
        is_missed = actual_slack < cx.min_connect_minutes

        if is_missed:
            total_missed_pax += cx.passengers
            reason = (
                f"Transfer time shrunk to {actual_slack}m at {cx.airport} "
                f"(scheduled {sched_slack}m, minimum required {cx.min_connect_minutes}m)."
            )
        else:
            reason = (
                f"Connection maintained with {actual_slack}m transfer slack "
                f"(minimum {cx.min_connect_minutes}m)."
            )

        results.append(
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
                reason=reason,
            )
        )

    # Sort results with missed connections first, then by connection_id
    results.sort(key=lambda c: (0 if c.is_missed else 1, c.connection_id))
    return results, total_missed_pax
