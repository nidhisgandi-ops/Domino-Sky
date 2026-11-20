"""Scenario engine managing isolated, deterministic flight disruption simulations.

Ensures that every scenario runs in full isolation starting from baseline network state,
preventing cross-contamination while supporting scenario creation, deletion,
and stateful recovery interventions.
"""

import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional
from data_loader import DataLoader
from models import (
    RecoveryAction,
    ScenarioCreateRequest,
    ScenarioSummary,
    SimulationResult,
)
from simulation.baseline_engine import compute_baseline
from simulation.disruption_engine import run_simulation
from simulation.recovery_engine import evaluate_recovery_action


class ScenarioRecord:
    """Encapsulates isolated state for a single scenario."""

    def __init__(
        self,
        scenario_id: str,
        scenario_name: str,
        airport_id: Optional[str] = None,
        closure_start: Optional[str] = None,
        closure_duration_minutes: Optional[int] = None,
    ):
        self.scenario_id = scenario_id
        self.scenario_name = scenario_name
        self.created_at = datetime.now(timezone.utc).isoformat()
        self.airport_id = airport_id
        self.closure_start = closure_start
        self.closure_duration_minutes = closure_duration_minutes
        self.closure_end: Optional[str] = None
        self.applied_actions: List[RecoveryAction] = []
        self.simulation_result: Optional[SimulationResult] = None


class ScenarioManager:
    """Maintains an isolated repository of scenario states."""

    def __init__(self, data_loader: DataLoader):
        self.data_loader = data_loader
        self._scenarios: Dict[str, ScenarioRecord] = {}

    def create_scenario(
        self,
        scenario_name: str,
        airport_id: Optional[str] = None,
        closure_start: Optional[str] = None,
        closure_duration_minutes: Optional[int] = None,
        scenario_id: Optional[str] = None,
    ) -> ScenarioRecord:
        """Create a new isolated scenario record."""
        sid = scenario_id or str(uuid.uuid4())
        record = ScenarioRecord(
            scenario_id=sid,
            scenario_name=scenario_name,
            airport_id=airport_id,
            closure_start=closure_start,
            closure_duration_minutes=closure_duration_minutes,
        )
        self._scenarios[sid] = record

        # Automatically execute initial simulation for the scenario
        if airport_id and closure_start and closure_duration_minutes is not None:
            result = run_simulation(
                data_loader=self.data_loader,
                airport_id=airport_id,
                closure_start=closure_start,
                closure_duration_minutes=closure_duration_minutes,
                scenario_id=sid,
                scenario_name=scenario_name,
                recovery_actions=[],
            )
            record.closure_end = result.closure_end
            record.simulation_result = result
        else:
            record.simulation_result = compute_baseline(self.data_loader)

        return record

    def get_scenario(self, scenario_id: str) -> Optional[ScenarioRecord]:
        return self._scenarios.get(scenario_id)

    def list_scenarios(self) -> List[ScenarioSummary]:
        summaries: List[ScenarioSummary] = []
        for s in self._scenarios.values():
            actions_dicts = [
                {
                    "action_type": a.action_type.value,
                    "target_flight_id": a.target_flight_id,
                    "spare_tail_id": a.spare_tail_id,
                    "description": a.description,
                }
                for a in s.applied_actions
            ]
            summaries.append(
                ScenarioSummary(
                    scenario_id=s.scenario_id,
                    scenario_name=s.scenario_name,
                    created_at=s.created_at,
                    airport_id=s.airport_id,
                    closure_start=s.closure_start,
                    closure_duration_minutes=s.closure_duration_minutes,
                    closure_end=s.closure_end,
                    applied_actions=actions_dicts,
                    metrics=s.simulation_result.metrics if s.simulation_result else None,
                )
            )
        return summaries

    def delete_scenario(self, scenario_id: str) -> bool:
        if scenario_id in self._scenarios:
            del self._scenarios[scenario_id]
            return True
        return False

    def run_or_update_simulation(
        self,
        airport_id: str,
        closure_start: str,
        closure_duration_minutes: int,
        scenario_name: Optional[str] = None,
        scenario_id: Optional[str] = None,
    ) -> SimulationResult:
        """Run or update a disruption scenario with given closure parameters."""
        sid = scenario_id or str(uuid.uuid4())
        sname = scenario_name or f"{airport_id} Closure {closure_duration_minutes}min"

        result = run_simulation(
            data_loader=self.data_loader,
            airport_id=airport_id,
            closure_start=closure_start,
            closure_duration_minutes=closure_duration_minutes,
            scenario_id=sid,
            scenario_name=sname,
            recovery_actions=[],
        )

        record = ScenarioRecord(
            scenario_id=sid,
            scenario_name=sname,
            airport_id=airport_id,
            closure_start=closure_start,
            closure_duration_minutes=closure_duration_minutes,
        )
        record.closure_end = result.closure_end
        record.simulation_result = result
        self._scenarios[sid] = record

        return result

    def apply_recovery_action(
        self,
        scenario_id: str,
        action: RecoveryAction,
    ) -> SimulationResult:
        """Apply a recovery action into a scenario, recalculating rotation cascade."""
        record = self.get_scenario(scenario_id)
        if not record:
            raise KeyError(f"Scenario '{scenario_id}' not found.")

        current_res = record.simulation_result or compute_baseline(self.data_loader)
        eval_resp = evaluate_recovery_action(
            data_loader=self.data_loader,
            current_result=current_res,
            action=action,
            airport_id=record.airport_id,
            closure_start=record.closure_start,
            closure_duration_minutes=record.closure_duration_minutes,
            existing_actions=record.applied_actions,
        )

        if not eval_resp.is_feasible:
            raise ValueError(f"Recovery action is infeasible: {eval_resp.infeasibility_reason}")

        record.applied_actions.append(action)
        record.simulation_result = eval_resp.simulation_result
        return record.simulation_result

    def reset(self) -> None:
        """Clear all created scenarios and reset simulator state."""
        self._scenarios.clear()


# Global singleton scenario manager
_scenario_manager_instance: Optional[ScenarioManager] = None


def get_scenario_manager(data_loader: DataLoader) -> ScenarioManager:
    global _scenario_manager_instance
    if _scenario_manager_instance is None:
        _scenario_manager_instance = ScenarioManager(data_loader)
    return _scenario_manager_instance


def reset_scenario_manager(data_loader: DataLoader) -> ScenarioManager:
    global _scenario_manager_instance
    _scenario_manager_instance = ScenarioManager(data_loader)
    return _scenario_manager_instance
