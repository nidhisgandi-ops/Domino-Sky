"""Integration tests for all Domino Sky REST API endpoints."""

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_api_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["airports_count"] == 16
    assert data["flights_count"] == 70
    assert data["aircraft_count"] == 16
    assert data["connections_count"] == 21
    assert data["crews_count"] == 16
    assert data["spare_aircraft_count"] == 2


def test_api_airports():
    res = client.get("/api/airports")
    assert res.status_code == 200
    airports = res.json()
    assert len(airports) == 16
    ap_ids = {a["id"] for a in airports}
    assert "DEL" in ap_ids
    assert "BOM" in ap_ids
    assert "BLR" in ap_ids

    # Single airport
    res_single = client.get("/api/airports/BOM")
    assert res_single.status_code == 200
    assert res_single.json()["city"] == "Mumbai"

    # Non-existent airport
    res_404 = client.get("/api/airports/XYZ")
    assert res_404.status_code == 404


def test_api_flights():
    res = client.get("/api/flights")
    assert res.status_code == 200
    flights = res.json()
    assert len(flights) == 70

    res_single = client.get("/api/flights/DS0101")
    assert res_single.status_code == 200
    assert res_single.json()["origin"] == "DEL"
    assert res_single.json()["destination"] == "JAI"


def test_api_aircraft():
    res = client.get("/api/aircraft")
    assert res.status_code == 200
    aircraft = res.json()
    assert len(aircraft) == 16


def test_api_connections():
    res = client.get("/api/connections")
    assert res.status_code == 200
    connections = res.json()
    assert len(connections) == 21


def test_api_crews():
    res = client.get("/api/crews")
    assert res.status_code == 200
    crews = res.json()
    assert len(crews) == 16


def test_api_spare_aircraft():
    res = client.get("/api/spare-aircraft")
    assert res.status_code == 200
    spares = res.json()
    assert len(spares) == 2
    tails = {s["tail_id"] for s in spares}
    assert "VT-DS17" in tails
    assert "VT-DS18" in tails


def test_api_baseline():
    res = client.get("/api/baseline")
    assert res.status_code == 200
    data = res.json()
    assert data["metrics"]["total_delay_minutes"] == 0
    assert data["metrics"]["delayed_count"] == 0
    assert len(data["affected_flights"]) == 70


def test_api_simulation_run_and_results():
    body = {
        "airport_id": "BOM",
        "closure_start": "08:00",
        "closure_duration_minutes": 90,
        "scenario_name": "BOM Closure 90min",
    }
    res = client.post("/api/simulation/run", json=body)
    assert res.status_code == 200
    sim_data = res.json()
    sid = sim_data["scenario_id"]
    assert sid is not None
    assert sim_data["airport_id"] == "BOM"
    assert sim_data["closure_start"] == "08:00"
    assert sim_data["closure_duration_minutes"] == 90
    assert sim_data["closure_end"] == "09:30"
    assert sim_data["metrics"]["delayed_count"] > 0
    assert sim_data["metrics"]["total_delay_minutes"] > 0
    assert len(sim_data["affected_flights"]) == 70
    assert len(sim_data["timeline_events"]) > 0
    assert "DS0201" in sim_data["delay_chain"]

    # Retrieve results via GET
    res_get = client.get(f"/api/simulation/{sid}/results")
    assert res_get.status_code == 200
    assert res_get.json()["scenario_id"] == sid


def test_api_scenarios_crud():
    # Create scenario
    create_body = {
        "scenario_name": "DEL Thunderstorm",
        "airport_id": "DEL",
        "closure_start": "10:00",
        "closure_duration_minutes": 60,
    }
    res_create = client.post("/api/scenarios", json=create_body)
    assert res_create.status_code == 200
    s_data = res_create.json()
    sid = s_data["scenario_id"]
    assert sid is not None

    # List scenarios
    res_list = client.get("/api/scenarios")
    assert res_list.status_code == 200
    s_list = res_list.json()
    assert any(s["scenario_id"] == sid for s in s_list)

    # Get single scenario
    res_get = client.get(f"/api/scenarios/{sid}")
    assert res_get.status_code == 200
    assert res_get.json()["scenario_name"] == "DEL Thunderstorm"

    # Delete scenario
    res_del = client.delete(f"/api/scenarios/{sid}")
    assert res_del.status_code == 200

    # Ensure deleted
    res_del_verify = client.get(f"/api/scenarios/{sid}")
    assert res_del_verify.status_code == 404


def test_api_recovery_evaluate_and_apply():
    # 1. Run a simulation to create scenario
    run_body = {
        "airport_id": "BOM",
        "closure_start": "08:00",
        "closure_duration_minutes": 90,
        "scenario_name": "BOM Eval Test",
    }
    res_sim = client.post("/api/simulation/run", json=run_body)
    sid = res_sim.json()["scenario_id"]

    # 2. Evaluate substitution (VT-DS17 @ BLR for DS0502)
    eval_body = {
        "scenario_id": sid,
        "action_type": "SUBSTITUTE_AIRCRAFT",
        "target_flight_id": "DS0502",
        "spare_tail_id": "VT-DS17",
    }
    res_eval = client.post("/api/recovery/evaluate", json=eval_body)
    assert res_eval.status_code == 200
    eval_data = res_eval.json()
    assert eval_data["is_feasible"] is True
    assert "Crew availability and aircraft-specific operational compatibility" in eval_data["disclaimer"]
    assert "improvement" in eval_data

    # 3. Apply recovery
    apply_body = {
        "scenario_id": sid,
        "action_type": "SUBSTITUTE_AIRCRAFT",
        "target_flight_id": "DS0502",
        "spare_tail_id": "VT-DS17",
    }
    res_apply = client.post("/api/recovery/apply", json=apply_body)
    assert res_apply.status_code == 200
    applied_sim = res_apply.json()
    f_res = next(f for f in applied_sim["affected_flights"] if f["flight_id"] == "DS0502")
    assert f_res["tail_id"] == "VT-DS17"

    # 4. Get recommendations
    res_recs = client.get(f"/api/recovery/recommendations/{sid}")
    assert res_recs.status_code == 200
    assert isinstance(res_recs.json(), list)


def test_api_simulation_reset():
    res = client.post("/api/simulation/reset")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"
