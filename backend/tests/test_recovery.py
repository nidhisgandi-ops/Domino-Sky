"""Tests for recovery engine actions, feasibility checks, and ranking algorithms."""

from data_loader import DataLoader
from models import (
    RecoveryAction,
    RecoveryActionType,
)
from simulation.disruption_engine import run_simulation
from simulation.recovery_engine import (
    DISCLAIMER_TEXT,
    evaluate_recovery_action,
    generate_recommendations,
)
from simulation.scenario_engine import ScenarioManager


def test_spare_substitution_feasibility():
    loader = DataLoader()
    sim = run_simulation(
        data_loader=loader,
        airport_id="BOM",
        closure_start="08:00",
        closure_duration_minutes=90,
    )

    # VT-DS17 is based at BLR
    # DS0502 departs from BLR (origin: BLR, destination: COK)
    act_blr_valid = RecoveryAction(
        action_type=RecoveryActionType.SUBSTITUTE_AIRCRAFT,
        target_flight_id="DS0502",
        spare_tail_id="VT-DS17",
    )
    eval_valid = evaluate_recovery_action(loader, sim, act_blr_valid)
    assert eval_valid.is_feasible is True
    assert eval_valid.disclaimer == DISCLAIMER_TEXT

    # Try substituting VT-DS17 for a flight departing from DEL (e.g. DS0101)
    act_del_invalid = RecoveryAction(
        action_type=RecoveryActionType.SUBSTITUTE_AIRCRAFT,
        target_flight_id="DS0101",
        spare_tail_id="VT-DS17",
    )
    eval_invalid = evaluate_recovery_action(loader, sim, act_del_invalid)
    assert eval_invalid.is_feasible is False
    assert "stationed at BLR" in eval_invalid.infeasibility_reason

    # VT-DS18 is based at DEL
    # DS0101 departs from DEL (origin: DEL, destination: JAI)
    act_del_valid = RecoveryAction(
        action_type=RecoveryActionType.SUBSTITUTE_AIRCRAFT,
        target_flight_id="DS0101",
        spare_tail_id="VT-DS18",
    )
    eval_del_valid = evaluate_recovery_action(loader, sim, act_del_valid)
    assert eval_del_valid.is_feasible is True


def test_flight_cancellation_evaluation():
    loader = DataLoader()
    sim = run_simulation(
        data_loader=loader,
        airport_id="BOM",
        closure_start="08:00",
        closure_duration_minutes=90,
    )

    act_cancel = RecoveryAction(
        action_type=RecoveryActionType.CANCEL_FLIGHT,
        target_flight_id="DS0501",
    )
    eval_cancel = evaluate_recovery_action(loader, sim, act_cancel)
    assert eval_cancel.is_feasible is True
    assert eval_cancel.after_metrics.cancelled_flights >= 1
    assert eval_cancel.disclaimer == DISCLAIMER_TEXT


def test_apply_recovery_to_scenario():
    loader = DataLoader()
    mgr = ScenarioManager(loader)

    s = mgr.create_scenario(
        scenario_name="BOM 90m",
        airport_id="BOM",
        closure_start="08:00",
        closure_duration_minutes=90,
    )

    initial_delay = s.simulation_result.metrics.total_delay_minutes

    act = RecoveryAction(
        action_type=RecoveryActionType.SUBSTITUTE_AIRCRAFT,
        target_flight_id="DS0502",
        spare_tail_id="VT-DS17",
    )

    updated_result = mgr.apply_recovery_action(s.scenario_id, act)
    assert updated_result is not None
    # DS0502 should now be operated by VT-DS17
    f_res = next(f for f in updated_result.affected_flights if f.flight_id == "DS0502")
    assert f_res.tail_id == "VT-DS17"
    assert f_res.original_tail_id == "VT-DS05"


def test_recommendations_and_ranking():
    loader = DataLoader()
    sim = run_simulation(
        data_loader=loader,
        airport_id="BOM",
        closure_start="08:00",
        closure_duration_minutes=90,
    )

    recs = generate_recommendations(loader, sim)
    assert len(recs) > 0

    # Verify ranking monotonicity:
    # 1) avoid crew violations, 2) minimize missed connections, 3) minimize cancellations, 4) minimize total delay
    for i in range(len(recs) - 1):
        m1 = recs[i].after_metrics
        m2 = recs[i + 1].after_metrics
        key1 = (m1.crew_violations, m1.missed_connection_passengers, m1.cancelled_flights, m1.total_delay_minutes)
        key2 = (m2.crew_violations, m2.missed_connection_passengers, m2.cancelled_flights, m2.total_delay_minutes)
        assert key1 <= key2
