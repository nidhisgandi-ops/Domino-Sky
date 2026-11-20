"""Airport API endpoints for Domino Sky simulator."""

from typing import List
from fastapi import APIRouter, HTTPException
from data_loader import get_data_loader
from models import Airport

router = APIRouter(prefix="/api/airports", tags=["airports"])


@router.get("", response_model=List[Airport])
def list_airports() -> List[Airport]:
    """Retrieve all operational airports in the flight network."""
    loader = get_data_loader()
    return loader.airports


@router.get("/{airport_id}", response_model=Airport)
def get_airport(airport_id: str) -> Airport:
    """Retrieve details for a specific airport by IATA code."""
    loader = get_data_loader()
    airport = loader.get_airport(airport_id.upper())
    if not airport:
        raise HTTPException(status_code=404, detail=f"Airport '{airport_id}' not found.")
    return airport
