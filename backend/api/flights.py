"""Flight, fleet, crew, and connection endpoints for Domino Sky simulator."""

from typing import List
from fastapi import APIRouter, HTTPException
from data_loader import get_data_loader
from models import Aircraft, Connection, Crew, Flight, SpareAircraft

router = APIRouter(prefix="/api", tags=["network"])


@router.get("/flights", response_model=List[Flight])
def list_flights() -> List[Flight]:
    """Retrieve all scheduled flights in the network."""
    loader = get_data_loader()
    return loader.flights


@router.get("/flights/{flight_id}", response_model=Flight)
def get_flight(flight_id: str) -> Flight:
    """Retrieve a single scheduled flight by its flight ID."""
    loader = get_data_loader()
    flight = loader.get_flight(flight_id.upper())
    if not flight:
        raise HTTPException(status_code=404, detail=f"Flight '{flight_id}' not found.")
    return flight


@router.get("/aircraft", response_model=List[Aircraft])
def list_aircraft() -> List[Aircraft]:
    """Retrieve all aircraft in the active fleet."""
    loader = get_data_loader()
    return loader.aircraft


@router.get("/connections", response_model=List[Connection])
def list_connections() -> List[Connection]:
    """Retrieve all passenger connection definitions."""
    loader = get_data_loader()
    return loader.connections


@router.get("/crews", response_model=List[Crew])
def list_crews() -> List[Crew]:
    """Retrieve all flight crew roster definitions."""
    loader = get_data_loader()
    return loader.crews


@router.get("/spare-aircraft", response_model=List[SpareAircraft])
def list_spare_aircraft() -> List[SpareAircraft]:
    """Retrieve all unassigned spare aircraft available for tactical recovery."""
    loader = get_data_loader()
    return loader.spare_aircraft
