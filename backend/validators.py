"""Data validation module for Domino Sky flight network dataset.

Performs strict integrity checks on raw JSON data to ensure simulation calculations
are deterministic, complete, and mathematically consistent.
"""

from typing import Any, Dict, List, Set
from simulation.time_engine import time_to_minutes


class ValidationError(Exception):
    """Raised when the dataset fails operational or schema validation."""
    pass


def validate_network_data(data: Dict[str, Any]) -> None:
    """Validate the loaded flight network JSON dataset.

    Enforces:
    - Meta configuration presence and types
    - Airport record completeness and valid coordinate/capacity bounds
    - Flight records consistency: origin/destination validity, leg orders, block times
    - Connection feasibility logic: from_flight and to_flight airport matching
    - Crew record completeness: valid tail_id and referenced flight_ids
    - Spare aircraft validity: bases, availability times, seat capacities
    """
    if not isinstance(data, dict):
        raise ValidationError("Root JSON data must be an object")

    # 1. Meta validation
    if "meta" not in data or not isinstance(data["meta"], dict):
        raise ValidationError("Missing 'meta' section in dataset")
    meta = data["meta"]
    if "min_turnaround_minutes" not in meta or not isinstance(meta["min_turnaround_minutes"], (int, float)):
        raise ValidationError("Missing or invalid 'min_turnaround_minutes' in meta")
    if meta["min_turnaround_minutes"] <= 0:
        raise ValidationError("'min_turnaround_minutes' must be positive")

    # 2. Airports validation
    if "airports" not in data or not isinstance(data["airports"], list):
        raise ValidationError("Missing 'airports' list in dataset")
    airport_ids: Set[str] = set()
    for ap in data["airports"]:
        if not isinstance(ap, dict):
            raise ValidationError("Airport record must be a dict")
        for key in ["id", "name", "city", "lat", "lng", "tier", "capacity_per_hour"]:
            if key not in ap:
                raise ValidationError(f"Airport missing required field '{key}': {ap}")
        ap_id = ap["id"]
        if ap_id in airport_ids:
            raise ValidationError(f"Duplicate airport ID '{ap_id}' detected")
        airport_ids.add(ap_id)
        if not (-90 <= ap["lat"] <= 90):
            raise ValidationError(f"Invalid latitude for airport {ap_id}: {ap['lat']}")
        if not (-180 <= ap["lng"] <= 180):
            raise ValidationError(f"Invalid longitude for airport {ap_id}: {ap['lng']}")
        if ap["capacity_per_hour"] <= 0:
            raise ValidationError(f"Invalid capacity for airport {ap_id}")

    if not airport_ids:
        raise ValidationError("Airports list is empty")

    # 3. Flights validation
    if "flights" not in data or not isinstance(data["flights"], list):
        raise ValidationError("Missing 'flights' list in dataset")

    flight_ids: Set[str] = set()
    tail_legs: Dict[str, List[Dict[str, Any]]] = {}

    for fl in data["flights"]:
        if not isinstance(fl, dict):
            raise ValidationError("Flight record must be a dict")
        for key in ["flight_id", "tail_id", "leg_order", "origin", "destination", "dep", "arr", "block_minutes", "pax"]:
            if key not in fl:
                raise ValidationError(f"Flight missing required field '{key}': {fl}")
        f_id = fl["flight_id"]
        if f_id in flight_ids:
            raise ValidationError(f"Duplicate flight_id '{f_id}' detected")
        flight_ids.add(f_id)

        if fl["origin"] not in airport_ids:
            raise ValidationError(f"Flight {f_id} origin '{fl['origin']}' does not exist in airports")
        if fl["destination"] not in airport_ids:
            raise ValidationError(f"Flight {f_id} destination '{fl['destination']}' does not exist in airports")
        if fl["origin"] == fl["destination"]:
            raise ValidationError(f"Flight {f_id} origin and destination cannot be identical")

        dep_mins = time_to_minutes(fl["dep"])
        arr_mins = time_to_minutes(fl["arr"])
        block_mins = fl["block_minutes"]
        if block_mins <= 0:
            raise ValidationError(f"Flight {f_id} block_minutes must be positive")

        expected_arr = dep_mins + block_mins
        if expected_arr != arr_mins and (expected_arr % 1440) != arr_mins:
            raise ValidationError(f"Flight {f_id} block time mismatch: dep {fl['dep']} + {block_mins}m != arr {fl['arr']}")

        tail_id = fl["tail_id"]
        if tail_id not in tail_legs:
            tail_legs[tail_id] = []
        tail_legs[tail_id].append(fl)

    # Validate rotation continuity for each aircraft
    for tail_id, legs in tail_legs.items():
        legs.sort(key=lambda x: x["leg_order"])
        for i, leg in enumerate(legs):
            if leg["leg_order"] != i + 1:
                raise ValidationError(f"Tail {tail_id} has discontinuous leg_order at flight {leg['flight_id']}")
            if i > 0:
                prev_leg = legs[i - 1]
                if leg["origin"] != prev_leg["destination"]:
                    raise ValidationError(
                        f"Tail {tail_id} flight {leg['flight_id']} departs from {leg['origin']}, "
                        f"but previous flight {prev_leg['flight_id']} landed at {prev_leg['destination']}"
                    )
                prev_arr_mins = time_to_minutes(prev_leg["arr"])
                curr_dep_mins = time_to_minutes(leg["dep"])
                scheduled_turn = curr_dep_mins - prev_arr_mins
                if scheduled_turn < meta["min_turnaround_minutes"]:
                    raise ValidationError(
                        f"Tail {tail_id} scheduled turnaround {scheduled_turn}m between {prev_leg['flight_id']} "
                        f"and {leg['flight_id']} is below minimum {meta['min_turnaround_minutes']}m"
                    )

    # 4. Connections validation
    if "connections" in data and isinstance(data["connections"], list):
        conn_ids: Set[str] = set()
        flight_lookup = {f["flight_id"]: f for f in data["flights"]}
        for cx in data["connections"]:
            for key in ["connection_id", "airport", "from_flight", "to_flight", "passengers", "min_connect_minutes"]:
                if key not in cx:
                    raise ValidationError(f"Connection missing field '{key}': {cx}")
            c_id = cx["connection_id"]
            if c_id in conn_ids:
                raise ValidationError(f"Duplicate connection_id '{c_id}'")
            conn_ids.add(c_id)

            from_f = flight_lookup.get(cx["from_flight"])
            to_f = flight_lookup.get(cx["to_flight"])
            if not from_f:
                raise ValidationError(f"Connection {c_id} references non-existent from_flight {cx['from_flight']}")
            if not to_f:
                raise ValidationError(f"Connection {c_id} references non-existent to_flight {cx['to_flight']}")

            if from_f["destination"] != cx["airport"]:
                raise ValidationError(
                    f"Connection {c_id} airport {cx['airport']} does not match from_flight destination {from_f['destination']}"
                )
            if to_f["origin"] != cx["airport"]:
                raise ValidationError(
                    f"Connection {c_id} airport {cx['airport']} does not match to_flight origin {to_f['origin']}"
                )

    # 5. Crews validation
    if "crews" in data and isinstance(data["crews"], list):
        crew_ids: Set[str] = set()
        for cr in data["crews"]:
            for key in ["crew_id", "tail_id", "base", "duty_start", "max_duty_mins", "flight_ids"]:
                if key not in cr:
                    raise ValidationError(f"Crew missing field '{key}': {cr}")
            cr_id = cr["crew_id"]
            if cr_id in crew_ids:
                raise ValidationError(f"Duplicate crew_id '{cr_id}'")
            crew_ids.add(cr_id)
            for f_id in cr["flight_ids"]:
                if f_id not in flight_ids:
                    raise ValidationError(f"Crew {cr_id} references unknown flight_id '{f_id}'")

    # 6. Spare aircraft validation
    if "spare_aircraft" in data and isinstance(data["spare_aircraft"], list):
        for sp in data["spare_aircraft"]:
            for key in ["tail_id", "base", "available_from", "seats"]:
                if key not in sp:
                    raise ValidationError(f"Spare aircraft missing field '{key}': {sp}")
            if sp["base"] not in airport_ids:
                raise ValidationError(f"Spare aircraft {sp['tail_id']} base {sp['base']} not in airports")
