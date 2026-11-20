from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class DelayCauseType(str, Enum):
    NONE = "NONE"
    AIRPORT_CLOSURE = "AIRPORT_CLOSURE"
    PREVIOUS_FLIGHT_DELAY = "PREVIOUS_FLIGHT_DELAY"
    AIRCRAFT_TURNAROUND = "AIRCRAFT_TURNAROUND"
    AIRCRAFT_UNAVAILABLE = "AIRCRAFT_UNAVAILABLE"
    RECOVERY_ACTION = "RECOVERY_ACTION"


class FlightStatus(str, Enum):
    ON_TIME = "ON_TIME"
    DELAYED = "DELAYED"
    CANCELLED = "CANCELLED"


class ConnectionStatus(str, Enum):
    MAINTAINED = "MAINTAINED"
    MISSED = "MISSED"


class RecoveryActionType(str, Enum):
    CANCEL_FLIGHT = "CANCEL_FLIGHT"
    SUBSTITUTE_AIRCRAFT = "SUBSTITUTE_AIRCRAFT"


# Base Data Models loaded from JSON

class Airport(BaseModel):
    id: str
    name: str
    city: str
    lat: float
    lng: float
    tier: str
    capacity_per_hour: int


class Flight(BaseModel):
    flight_id: str
    tail_id: str
    leg_order: int
    origin: str
    destination: str
    dep: str
    arr: str
    block_minutes: int
    pax: int
    turnaround_before_min: Optional[int] = None


class Aircraft(BaseModel):
    tail_id: str
    base: str
    seats: int = 180
    flight_count: int = 0
    flight_ids: List[str] = Field(default_factory=list)


class Connection(BaseModel):
    connection_id: str
    airport: str
    from_flight: str
    to_flight: str
    passengers: int
    min_connect_minutes: int


class Crew(BaseModel):
    crew_id: str
    tail_id: str
    base: str
    duty_start: str
    max_duty_mins: int
    flight_ids: List[str]


class SpareAircraft(BaseModel):
    tail_id: str
    base: str
    available_from: str
    seats: int = 180


class NetworkMeta(BaseModel):
    dataset: str
    operating_day: str
    min_turnaround_minutes: int = 30
    seats_per_aircraft: int = 180
    notes: List[str] = Field(default_factory=list)


# Simulation Models

class FlightResult(BaseModel):
    flight_id: str
    tail_id: str
    original_tail_id: Optional[str] = None
    leg_order: int
    origin: str
    destination: str
    scheduled_departure: str
    scheduled_arrival: str
    actual_departure: Optional[str] = None
    actual_arrival: Optional[str] = None
    scheduled_dep_mins: int
    scheduled_arr_mins: int
    actual_dep_mins: Optional[int] = None
    actual_arr_mins: Optional[int] = None
    block_minutes: int
    delay_minutes: int = 0
    departure_delay_minutes: int = 0
    arrival_delay_minutes: int = 0
    status: FlightStatus = FlightStatus.ON_TIME
    is_cancelled: bool = False
    primary_cause: DelayCauseType = DelayCauseType.NONE
    caused_by_flight_id: Optional[str] = None
    cause_chain: List[str] = Field(default_factory=list)
    explanation: str = ""
    pax: int
    turnaround_before_min: Optional[int] = None


class MissedConnection(BaseModel):
    connection_id: str
    airport: str
    from_flight: str
    to_flight: str
    passengers: int
    min_connect_minutes: int
    scheduled_slack_minutes: int
    actual_slack_minutes: Optional[int] = None
    status: ConnectionStatus = ConnectionStatus.MAINTAINED
    is_missed: bool = False
    reason: str = ""


class CrewDutyResult(BaseModel):
    crew_id: str
    tail_id: str
    base: str
    duty_start: str
    duty_start_mins: int
    max_duty_mins: int
    scheduled_duty_mins: int
    actual_duty_mins: int
    slack_mins: int
    overtime_mins: int = 0
    violation: bool = False
    last_flight_id: Optional[str] = None
    scheduled_last_flight_arr: str
    actual_last_flight_arr: Optional[str] = None
    flight_ids: List[str] = Field(default_factory=list)
    reason: str = ""


class SimulationMetrics(BaseModel):
    delayed_count: int = 0
    total_delay_minutes: int = 0
    missed_connection_passengers: int = 0
    cancelled_flights: int = 0
    crew_violations: int = 0
    on_time_count: int = 0
    average_delay_minutes: float = 0.0


class TimelineEvent(BaseModel):
    time: str
    time_mins: int
    event_type: str
    flight_id: Optional[str] = None
    airport_id: Optional[str] = None
    description: str
    details: Dict[str, Any] = Field(default_factory=dict)


class SimulationResult(BaseModel):
    scenario_id: str
    scenario_name: str
    airport_id: Optional[str] = None
    closure_start: Optional[str] = None
    closure_duration_minutes: Optional[int] = None
    closure_end: Optional[str] = None
    affected_flights: List[FlightResult] = Field(default_factory=list)
    missed_connections: List[MissedConnection] = Field(default_factory=list)
    crew_status: List[CrewDutyResult] = Field(default_factory=list)
    metrics: SimulationMetrics
    delay_chain: Dict[str, List[str]] = Field(default_factory=dict)
    timeline_events: List[TimelineEvent] = Field(default_factory=list)
    summary: str = ""


# API Request/Response Models

class SimulationRequest(BaseModel):
    airport_id: str
    closure_start: str
    closure_duration_minutes: int
    scenario_name: Optional[str] = None


class ScenarioCreateRequest(BaseModel):
    scenario_name: str
    airport_id: Optional[str] = None
    closure_start: Optional[str] = None
    closure_duration_minutes: Optional[int] = None


class RecoveryAction(BaseModel):
    action_type: RecoveryActionType
    target_flight_id: str
    spare_tail_id: Optional[str] = None
    description: str = ""


class RecoveryEvaluateRequest(BaseModel):
    scenario_id: str
    action_type: RecoveryActionType
    target_flight_id: str
    spare_tail_id: Optional[str] = None


class RecoveryEvaluateResponse(BaseModel):
    scenario_id: str
    is_feasible: bool
    infeasibility_reason: Optional[str] = None
    action_type: RecoveryActionType
    target_flight_id: str
    spare_tail_id: Optional[str] = None
    before_metrics: SimulationMetrics
    after_metrics: SimulationMetrics
    improvement: Dict[str, int] = Field(default_factory=dict)
    disclaimer: str = "Crew availability and aircraft-specific operational compatibility are not independently verified"
    explanation: str = ""
    simulation_result: Optional[SimulationResult] = None


class RecoveryApplyRequest(BaseModel):
    scenario_id: str
    action_type: RecoveryActionType
    target_flight_id: str
    spare_tail_id: Optional[str] = None


class ScenarioSummary(BaseModel):
    scenario_id: str
    scenario_name: str
    created_at: str
    airport_id: Optional[str] = None
    closure_start: Optional[str] = None
    closure_duration_minutes: Optional[int] = None
    closure_end: Optional[str] = None
    applied_actions: List[Dict[str, Any]] = Field(default_factory=list)
    metrics: Optional[SimulationMetrics] = None
