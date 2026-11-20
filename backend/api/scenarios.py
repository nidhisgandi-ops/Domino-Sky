"""Scenario management API endpoints for Domino Sky simulator."""

from typing import List
from fastapi import APIRouter, HTTPException
from data_loader import get_data_loader
from models import ScenarioCreateRequest, ScenarioSummary
from simulation.scenario_engine import get_scenario_manager

router = APIRouter(prefix="/api/scenarios", tags=["scenarios"])


@router.post("", response_model=ScenarioSummary)
def create_scenario(request: ScenarioCreateRequest) -> ScenarioSummary:
    """Create a new isolated simulation scenario."""
    loader = get_data_loader()
    mgr = get_scenario_manager(loader)

    if request.airport_id:
        airport = loader.get_airport(request.airport_id.upper())
        if not airport:
            raise HTTPException(
                status_code=400,
                detail=f"Airport '{request.airport_id}' is not in the network.",
            )

    try:
        record = mgr.create_scenario(
            scenario_name=request.scenario_name,
            airport_id=request.airport_id.upper() if request.airport_id else None,
            closure_start=request.closure_start,
            closure_duration_minutes=request.closure_duration_minutes,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    return ScenarioSummary(
        scenario_id=record.scenario_id,
        scenario_name=record.scenario_name,
        created_at=record.created_at,
        airport_id=record.airport_id,
        closure_start=record.closure_start,
        closure_duration_minutes=record.closure_duration_minutes,
        closure_end=record.closure_end,
        applied_actions=[],
        metrics=record.simulation_result.metrics if record.simulation_result else None,
    )


@router.get("", response_model=List[ScenarioSummary])
def list_scenarios() -> List[ScenarioSummary]:
    """List all created simulation scenarios."""
    loader = get_data_loader()
    mgr = get_scenario_manager(loader)
    return mgr.list_scenarios()


@router.get("/{scenario_id}", response_model=ScenarioSummary)
def get_scenario(scenario_id: str) -> ScenarioSummary:
    """Retrieve metadata and metrics summary for a specific scenario."""
    loader = get_data_loader()
    mgr = get_scenario_manager(loader)
    record = mgr.get_scenario(scenario_id)
    if not record:
        raise HTTPException(status_code=404, detail=f"Scenario '{scenario_id}' not found.")

    actions_dicts = [
        {
            "action_type": a.action_type.value,
            "target_flight_id": a.target_flight_id,
            "spare_tail_id": a.spare_tail_id,
            "description": a.description,
        }
        for a in record.applied_actions
    ]

    return ScenarioSummary(
        scenario_id=record.scenario_id,
        scenario_name=record.scenario_name,
        created_at=record.created_at,
        airport_id=record.airport_id,
        closure_start=record.closure_start,
        closure_duration_minutes=record.closure_duration_minutes,
        closure_end=record.closure_end,
        applied_actions=actions_dicts,
        metrics=record.simulation_result.metrics if record.simulation_result else None,
    )


@router.delete("/{scenario_id}")
def delete_scenario(scenario_id: str):
    """Delete a scenario by ID."""
    loader = get_data_loader()
    mgr = get_scenario_manager(loader)
    deleted = mgr.delete_scenario(scenario_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Scenario '{scenario_id}' not found.")
    return {"status": "ok", "message": f"Scenario '{scenario_id}' deleted successfully."}
