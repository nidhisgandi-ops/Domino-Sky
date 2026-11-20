"""Simulation API endpoints for running disruptions and viewing cascades."""

from fastapi import APIRouter, HTTPException
from data_loader import get_data_loader
from models import SimulationRequest, SimulationResult
from simulation.baseline_engine import compute_baseline
from simulation.explanation_engine import explain_disruption_impact
from simulation.scenario_engine import get_scenario_manager

router = APIRouter(prefix="/api", tags=["simulation"])


@router.get("/baseline", response_model=SimulationResult)
def get_baseline() -> SimulationResult:
    """Retrieve undisturbed baseline schedule state with 0 delays."""
    loader = get_data_loader()
    return compute_baseline(loader)


@router.post("/simulation/run", response_model=SimulationResult)
def run_disruption_simulation(request: SimulationRequest) -> SimulationResult:
    """Execute airport closure simulation and calculate network disruption cascade."""
    loader = get_data_loader()
    airport = loader.get_airport(request.airport_id.upper())
    if not airport:
        raise HTTPException(
            status_code=400,
            detail=f"Airport '{request.airport_id}' is not recognized in flight network.",
        )

    if request.closure_duration_minutes <= 0:
        raise HTTPException(
            status_code=400,
            detail="closure_duration_minutes must be strictly greater than 0.",
        )

    mgr = get_scenario_manager(loader)
    try:
        return mgr.run_or_update_simulation(
            airport_id=request.airport_id.upper(),
            closure_start=request.closure_start,
            closure_duration_minutes=request.closure_duration_minutes,
            scenario_name=request.scenario_name,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/simulation/reset")
def reset_simulation():
    """Reset simulator state, clearing active scenarios."""
    loader = get_data_loader()
    mgr = get_scenario_manager(loader)
    mgr.reset()
    return {"status": "ok", "message": "Simulation manager reset to initial baseline state."}


@router.get("/simulation/{scenario_id}/results", response_model=SimulationResult)
def get_simulation_results(scenario_id: str) -> SimulationResult:
    """Retrieve full simulation results for a specific scenario by ID."""
    loader = get_data_loader()
    if scenario_id.lower() == "baseline":
        return compute_baseline(loader)

    mgr = get_scenario_manager(loader)
    record = mgr.get_scenario(scenario_id)
    if not record or not record.simulation_result:
        raise HTTPException(
            status_code=404,
            detail=f"Scenario with ID '{scenario_id}' was not found.",
        )
    return record.simulation_result


@router.get("/simulation/{scenario_id}/explanation")
def get_simulation_explanation(scenario_id: str):
    """Retrieve structured AI dispatcher narrative of delay cascades for a scenario."""
    loader = get_data_loader()
    mgr = get_scenario_manager(loader)

    if scenario_id.lower() == "baseline":
        baseline = compute_baseline(loader)
        return explain_disruption_impact(baseline)

    record = mgr.get_scenario(scenario_id)
    if not record or not record.simulation_result:
        raise HTTPException(
            status_code=404,
            detail=f"Scenario '{scenario_id}' was not found.",
        )
    return explain_disruption_impact(record.simulation_result)
