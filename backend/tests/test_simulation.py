"""Tests for simulation engine, baseline computations, and disruption cascades."""

from data_loader import DataLoader
from models import DelayCauseType, FlightStatus
from simulation.baseline_engine import compute_baseline
from simulation.disruption_engine import run_simulation
from simulation.scenario_engine import ScenarioManager


def test_baseline_simulation():
    loader = DataLoader()
    baseline = compute_baseline(loader)

    assert baseline.metrics.delayed_count == 0
    assert baseline.metrics.total_delay_minutes == 0
    assert baseline.metrics.cancelled_flights == 0
    assert baseline.metrics.missed_connection_passengers == 0
    assert baseline.metrics.crew_violations == 0
    assert baseline.metrics.on_time_count == len(loader.flights)

    for f in baseline.affected_flights:
        assert f.status == FlightStatus.ON_TIME
        assert f.delay_minutes == 0
        assert f.actual_departure == f.scheduled_departure
        assert f.actual_arrival == f.scheduled_arrival


def test_bom_disruption_cascade():
    loader = DataLoader()
    # 90-minute closure at BOM from 08:00 to 09:30
    result = run_simulation(
        data_loader=loader,
        airport_id="BOM",
        closure_start="08:00",
        closure_duration_minutes=90,
        scenario_id="test_bom",
        scenario_name="Test BOM 90m Closure",
    )

    m = result.metrics
    assert m.delayed_count > 0
    assert m.total_delay_minutes > 0

    f_map = {f.flight_id: f for f in result.affected_flights}

    # DS0201: DEL -> BOM, sched dep 06:00, arr 08:10 (block 130m)
    # Arriving at BOM during 08:00-09:30 closure!
    # Must be held at DEL so it arrives at 09:30 -> dep at 07:20 (80m delay)
    ds0201 = f_map["DS0201"]
    assert ds0201.primary_cause == DelayCauseType.AIRPORT_CLOSURE
    assert ds0201.actual_arrival == "09:30"
    assert ds0201.actual_departure == "07:20"
    assert ds0201.delay_minutes == 80

    # Downstream flight on VT-DS02: DS0202 (BOM -> PNQ, sched dep 09:20)
    # Aircraft VT-DS02 arrives at 09:30. min_turnaround = 30m -> ready at 10:00!
    # Sched dep was 09:20 -> actual dep 10:00 (40m delay)
    # Primary cause must be turnaround delay from DS0201
    ds0202 = f_map["DS0202"]
    assert ds0202.actual_departure == "10:00"
    assert ds0202.delay_minutes == 40
    assert ds0202.primary_cause == DelayCauseType.AIRCRAFT_TURNAROUND
    assert ds0202.caused_by_flight_id == "DS0201"

    # Verify cause chain
    assert len(ds0202.cause_chain) > 0
    assert any("DS0201" in s for s in ds0202.cause_chain)

    # DS0501: BOM -> BLR, sched dep 08:15 (origin BOM closed until 09:30)
    # Must be held at BOM until 09:30
    ds0501 = f_map["DS0501"]
    assert ds0501.primary_cause == DelayCauseType.AIRPORT_CLOSURE
    assert ds0501.actual_departure == "09:30"
    assert ds0501.delay_minutes == 75  # 09:30 - 08:15 = 75m


def test_simulation_determinism():
    loader = DataLoader()
    run1 = run_simulation(
        data_loader=loader,
        airport_id="BOM",
        closure_start="08:00",
        closure_duration_minutes=90,
        scenario_id="s1",
    )
    run2 = run_simulation(
        data_loader=loader,
        airport_id="BOM",
        closure_start="08:00",
        closure_duration_minutes=90,
        scenario_id="s2",
    )

    assert run1.metrics.total_delay_minutes == run2.metrics.total_delay_minutes
    assert run1.metrics.delayed_count == run2.metrics.delayed_count
    assert run1.metrics.missed_connection_passengers == run2.metrics.missed_connection_passengers
    assert run1.metrics.crew_violations == run2.metrics.crew_violations

    for f1, f2 in zip(run1.affected_flights, run2.affected_flights):
        assert f1.actual_departure == f2.actual_departure
        assert f1.actual_arrival == f2.actual_arrival
        assert f1.delay_minutes == f2.delay_minutes
        assert f1.primary_cause == f2.primary_cause


def test_scenario_isolation():
    loader = DataLoader()
    mgr = ScenarioManager(loader)

    # Scenario 1: DEL closure 60m
    s1 = mgr.create_scenario(
        scenario_name="DEL Closure",
        airport_id="DEL",
        closure_start="09:00",
        closure_duration_minutes=60,
    )

    # Scenario 2: BOM closure 90m
    s2 = mgr.create_scenario(
        scenario_name="BOM Closure",
        airport_id="BOM",
        closure_start="08:00",
        closure_duration_minutes=90,
    )

    assert s1.scenario_id != s2.scenario_id
    assert s1.airport_id == "DEL"
    assert s2.airport_id == "BOM"
    # Ensure results are isolated
    assert s1.simulation_result.airport_id == "DEL"
    assert s2.simulation_result.airport_id == "BOM"
