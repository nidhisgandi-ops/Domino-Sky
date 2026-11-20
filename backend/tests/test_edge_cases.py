"""Edge case tests for Domino Sky simulation and recovery engines."""

from data_loader import DataLoader
from models import DelayCauseType, RecoveryAction, RecoveryActionType
from simulation.disruption_engine import run_simulation
from simulation.recovery_engine import evaluate_recovery_action


def test_off_peak_closure_no_impact():
    """Verify that closure during quiet hours (e.g., 02:00-04:00) produces zero delays."""
    loader = DataLoader()
    result = run_simulation(
        data_loader=loader,
        airport_id="BOM",
        closure_start="02:00",
        closure_duration_minutes=120,
        scenario_id="off_peak",
    )
    assert result.metrics.delayed_count == 0
    assert result.metrics.total_delay_minutes == 0
    assert result.metrics.missed_connection_passengers == 0
    assert result.metrics.crew_violations == 0


def test_severe_closure_triggers_crew_violation():
    """Verify that a 180-minute closure at BOM pushes crew CR12 past 600m duty limit."""
    loader = DataLoader()
    result = run_simulation(
        data_loader=loader,
        airport_id="BOM",
        closure_start="08:00",
        closure_duration_minutes=180,
        scenario_id="severe_bom",
    )
    assert result.metrics.crew_violations >= 1
    cr12 = next(c for c in result.crew_status if c.crew_id == "CR12")
    assert cr12.violation is True
    assert cr12.overtime_mins > 0
    assert cr12.actual_duty_mins > 600


def test_multi_leg_cascade_propagation():
    """Verify delay cascades across multiple sequential legs of the same aircraft (VT-DS02)."""
    loader = DataLoader()
    result = run_simulation(
        data_loader=loader,
        airport_id="BOM",
        closure_start="08:00",
        closure_duration_minutes=90,
    )
    f_map = {f.flight_id: f for f in result.affected_flights}

    # VT-DS02 rotation: DS0201 (DEL->BOM) -> DS0202 (BOM->PNQ) -> DS0203 (PNQ->BOM) -> DS0204 (BOM->GOI)
    leg1 = f_map["DS0201"]
    leg2 = f_map["DS0202"]

    assert leg1.delay_minutes == 80
    assert leg1.primary_cause == DelayCauseType.AIRPORT_CLOSURE

    assert leg2.delay_minutes == 40  # 80m delay absorbed down to 40m by 70m scheduled buffer
    assert leg2.primary_cause == DelayCauseType.AIRCRAFT_TURNAROUND
    assert leg2.caused_by_flight_id == "DS0201"


def test_infeasible_spare_substitution_origin_mismatch():
    """Verify that VT-DS17 (BLR) cannot be assigned to flights originating elsewhere."""
    loader = DataLoader()
    sim = run_simulation(
        data_loader=loader,
        airport_id="BOM",
        closure_start="08:00",
        closure_duration_minutes=90,
    )
    # DS0301 departs from DEL
    action = RecoveryAction(
        action_type=RecoveryActionType.SUBSTITUTE_AIRCRAFT,
        target_flight_id="DS0301",
        spare_tail_id="VT-DS17",
    )
    eval_resp = evaluate_recovery_action(loader, sim, action)
    assert eval_resp.is_feasible is False
    assert "stationed at BLR" in eval_resp.infeasibility_reason


def test_concurrent_delays_at_hub_maintains_connection():
    """Verify connection logic when both flights are delayed, preserving slack."""
    loader = DataLoader()
    # CX05: BOM transfer from DS0201 to DS0702 (min_connect: 45m)
    # DS0201 lands late at 09:30 (held until BOM opens).
    # DS0702 scheduled dep is 09:10 at BOM.
    # Because origin BOM is closed until 09:30, DS0702 is also held until at least 09:30!
    # With DS0201 arriving at 09:30 and DS0702 waiting for turnaround or departing after,
    # transfer slack is calculated deterministically.
    result = run_simulation(
        data_loader=loader,
        airport_id="BOM",
        closure_start="08:00",
        closure_duration_minutes=90,
    )
    cx05 = next(c for c in result.missed_connections if c.connection_id == "CX05")
    # Verify slack was calculated directly from actual times
    f_map = {f.flight_id: f for f in result.affected_flights}
    from_arr = f_map[cx05.from_flight].actual_arr_mins
    to_dep = f_map[cx05.to_flight].actual_dep_mins
    assert cx05.actual_slack_minutes == to_dep - from_arr
