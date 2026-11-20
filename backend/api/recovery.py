"""Recovery API endpoints for evaluating and applying operational recovery actions."""

from typing import List
from fastapi import APIRouter, HTTPException
from data_loader import get_data_loader
from models import (
    RecoveryAction,
    RecoveryApplyRequest,
    RecoveryEvaluateRequest,
    RecoveryEvaluateResponse,
    SimulationResult,
)
from simulation.baseline_engine import compute_baseline
from simulation.recovery_engine import (
    evaluate_recovery_action,
    generate_recommendations,
)
from simulation.scenario_engine import get_scenario_manager

router = APIRouter(prefix="/api/recovery", tags=["recovery"])


@router.post("/evaluate", response_model=RecoveryEvaluateResponse)
def evaluate_action(request: RecoveryEvaluateRequest) -> RecoveryEvaluateResponse:
    """Evaluate candidate recovery action (cancellation or spare swap) without altering scenario state."""
    loader = get_data_loader()
    mgr = get_scenario_manager(loader)

    if request.scenario_id.lower() == "baseline":
        current_res = compute_baseline(loader)
        existing_actions: List[RecoveryAction] = []
        airport_id = None
        closure_start = None
        closure_duration = None
    else:
        record = mgr.get_scenario(request.scenario_id)
        if not record:
            raise HTTPException(
                status_code=404,
                detail=f"Scenario with ID '{request.scenario_id}' was not found.",
            )
        current_res = record.simulation_result or compute_baseline(loader)
        existing_actions = record.applied_actions
        airport_id = record.airport_id
        closure_start = record.closure_start
        closure_duration = record.closure_duration_minutes

    action = RecoveryAction(
        action_type=request.action_type,
        target_flight_id=request.target_flight_id,
        spare_tail_id=request.spare_tail_id,
    )

    return evaluate_recovery_action(
        data_loader=loader,
        current_result=current_res,
        action=action,
        airport_id=airport_id,
        closure_start=closure_start,
        closure_duration_minutes=closure_duration,
        existing_actions=existing_actions,
    )


@router.post("/apply", response_model=SimulationResult)
def apply_action(request: RecoveryApplyRequest) -> SimulationResult:
    """Permanently apply a recovery action to a scenario, recalculating rotations and cascades."""
    loader = get_data_loader()
    mgr = get_scenario_manager(loader)

    record = mgr.get_scenario(request.scenario_id)
    if not record:
        raise HTTPException(
            status_code=404,
            detail=f"Scenario with ID '{request.scenario_id}' was not found.",
        )

    action = RecoveryAction(
        action_type=request.action_type,
        target_flight_id=request.target_flight_id,
        spare_tail_id=request.spare_tail_id,
    )

    try:
        updated_result = mgr.apply_recovery_action(request.scenario_id, action)
        return updated_result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/recommendations/{scenario_id}", response_model=List[RecoveryEvaluateResponse])
def get_recommendations(scenario_id: str) -> List[RecoveryEvaluateResponse]:
    """Retrieve ranked candidate recovery strategies prioritized by dispatch optimization criteria."""
    loader = get_data_loader()
    mgr = get_scenario_manager(loader)

    if scenario_id.lower() == "baseline":
        current_res = compute_baseline(loader)
        existing_actions: List[RecoveryAction] = []
    else:
        record = mgr.get_scenario(scenario_id)
        if not record or not record.simulation_result:
            raise HTTPException(
                status_code=404,
                detail=f"Scenario with ID '{scenario_id}' was not found.",
            )
        current_res = record.simulation_result
        existing_actions = record.applied_actions

    return generate_recommendations(
        data_loader=loader,
        current_result=current_res,
        existing_actions=existing_actions,
    )
