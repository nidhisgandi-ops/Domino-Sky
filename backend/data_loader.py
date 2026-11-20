"""Data loader module for loading and serving Domino Sky flight network dataset.

Loads from flight_network.json relative to the backend directory, validates schema
and aviation constraints, and provides typed accessors for all network entities.
"""

import json
from pathlib import Path
from typing import Dict, List, Optional

from models import (
    Aircraft,
    Airport,
    Connection,
    Crew,
    Flight,
    NetworkMeta,
    SpareAircraft,
)
from validators import validate_network_data


class DataLoader:
    """Manages raw and typed data for the Domino Sky network."""

    def __init__(self, json_path: Optional[str] = None):
        self._json_path = self._resolve_path(json_path)
        self._raw_data: Dict = {}
        self._meta: Optional[NetworkMeta] = None
        self._airports: Dict[str, Airport] = {}
        self._flights: Dict[str, Flight] = {}
        self._aircraft: Dict[str, Aircraft] = {}
        self._connections: Dict[str, Connection] = {}
        self._crews: Dict[str, Crew] = {}
        self._spare_aircraft: Dict[str, SpareAircraft] = {}
        self.load()

    def _resolve_path(self, path: Optional[str]) -> Path:
        if path:
            p = Path(path)
            if p.is_file():
                return p.resolve()

        candidates = [
            Path(__file__).resolve().parent.parent / "flight_network.json",
            Path(__file__).resolve().parent / "flight_network.json",
            Path.cwd() / "flight_network.json",
            Path.cwd().parent / "flight_network.json",
        ]
        for candidate in candidates:
            if candidate.is_file():
                return candidate.resolve()

        raise FileNotFoundError(
            f"flight_network.json could not be located. Searched candidate paths: {[str(c) for c in candidates]}"
        )

    def load(self) -> None:
        """Read and validate flight_network.json from filesystem."""
        with open(self._json_path, "r", encoding="utf-8") as f:
            self._raw_data = json.load(f)

        # Validate complete integrity
        validate_network_data(self._raw_data)

        # Parse Meta
        self._meta = NetworkMeta(**self._raw_data["meta"])

        # Parse Airports
        self._airports = {
            ap["id"]: Airport(**ap) for ap in self._raw_data["airports"]
        }

        # Parse Flights
        self._flights = {
            fl["flight_id"]: Flight(**fl) for fl in self._raw_data["flights"]
        }

        # Derive Aircraft from flights
        tail_flights: Dict[str, List[Flight]] = {}
        for fl in self._flights.values():
            tail_flights.setdefault(fl.tail_id, []).append(fl)

        self._aircraft = {}
        for tail_id, legs in tail_flights.items():
            sorted_legs = sorted(legs, key=lambda x: x.leg_order)
            base_airport = sorted_legs[0].origin if sorted_legs else "UNKNOWN"
            self._aircraft[tail_id] = Aircraft(
                tail_id=tail_id,
                base=base_airport,
                seats=self._meta.seats_per_aircraft,
                flight_count=len(sorted_legs),
                flight_ids=[leg.flight_id for leg in sorted_legs],
            )

        # Parse Connections
        self._connections = {
            cx["connection_id"]: Connection(**cx)
            for cx in self._raw_data.get("connections", [])
        }

        # Parse Crews
        self._crews = {
            cr["crew_id"]: Crew(**cr)
            for cr in self._raw_data.get("crews", [])
        }

        # Parse Spare Aircraft
        self._spare_aircraft = {
            sp["tail_id"]: SpareAircraft(**sp)
            for sp in self._raw_data.get("spare_aircraft", [])
        }

    @property
    def meta(self) -> NetworkMeta:
        if not self._meta:
            raise RuntimeError("Data not loaded")
        return self._meta

    @property
    def airports(self) -> List[Airport]:
        return list(self._airports.values())

    @property
    def airport_map(self) -> Dict[str, Airport]:
        return dict(self._airports)

    @property
    def flights(self) -> List[Flight]:
        return list(self._flights.values())

    @property
    def flight_map(self) -> Dict[str, Flight]:
        return dict(self._flights)

    @property
    def aircraft(self) -> List[Aircraft]:
        return list(self._aircraft.values())

    @property
    def aircraft_map(self) -> Dict[str, Aircraft]:
        return dict(self._aircraft)

    @property
    def connections(self) -> List[Connection]:
        return list(self._connections.values())

    @property
    def connection_map(self) -> Dict[str, Connection]:
        return dict(self._connections)

    @property
    def crews(self) -> List[Crew]:
        return list(self._crews.values())

    @property
    def crew_map(self) -> Dict[str, Crew]:
        return dict(self._crews)

    @property
    def spare_aircraft(self) -> List[SpareAircraft]:
        return list(self._spare_aircraft.values())

    @property
    def spare_aircraft_map(self) -> Dict[str, SpareAircraft]:
        return dict(self._spare_aircraft)

    def get_airport(self, airport_id: str) -> Optional[Airport]:
        return self._airports.get(airport_id)

    def get_flight(self, flight_id: str) -> Optional[Flight]:
        return self._flights.get(flight_id)

    def get_crew(self, crew_id: str) -> Optional[Crew]:
        return self._crews.get(crew_id)


# Global singleton instance
_loader_instance: Optional[DataLoader] = None


def get_data_loader() -> DataLoader:
    global _loader_instance
    if _loader_instance is None:
        _loader_instance = DataLoader()
    return _loader_instance


def reset_data_loader() -> DataLoader:
    global _loader_instance
    _loader_instance = DataLoader()
    return _loader_instance
