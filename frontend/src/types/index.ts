export interface Airport {
  id: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
  tier: 'mega_hub' | 'regional_hub' | 'spoke';
  capacity_per_hour: number;
}

export interface Flight {
  flight_id: string;
  tail_id: string;
  leg_order: number;
  origin: string;
  destination: string;
  dep: string; // HH:MM
  arr: string; // HH:MM
  block_minutes: number;
  pax: number;
  turnaround_before_min?: number | null;
}

export interface FlightResult {
  flight_id: string;
  tail_id: string;
  origin: string;
  destination: string;
  scheduled_dep: string;
  scheduled_arr: string;
  actual_dep: string | null;
  actual_arr: string | null;
  dep_delay_minutes: number;
  arr_delay_minutes: number;
  status: 'ON_TIME' | 'DELAYED' | 'CANCELLED' | 'BLOCKED';
  cause: string | null;
  cause_chain: string[];
  pax: number;
}

export interface Connection {
  connection_id: string;
  airport: string;
  from_flight: string;
  to_flight: string;
  passengers: number;
  min_connect_minutes: number;
}

export interface ConnectionResult {
  connection_id: string;
  airport: string;
  from_flight: string;
  to_flight: string;
  passengers: number;
  min_connect_minutes: number;
  actual_slack_minutes: number | null;
  status: 'FEASIBLE' | 'MISSED' | 'AT_RISK' | 'DISRUPTED';
}

export interface Crew {
  crew_id: string;
  tail_id: string;
  base: string;
  duty_start: string;
  max_duty_mins: number;
  flight_ids: string[];
}

export interface CrewStatus {
  crew_id: string;
  tail_id: string;
  base: string;
  duty_start: string;
  max_duty_mins: number;
  actual_duty_mins: number | null;
  last_flight_actual_arr: string | null;
  remaining_duty_mins: number | null;
  status: 'OK' | 'WARNING' | 'VIOLATION';
}

export interface SpareAircraft {
  tail_id: string;
  base: string;
  available_from: string;
  seats: number;
}

export interface OperationalMetrics {
  delayed_flights: number;
  total_delay_minutes: number;
  cancelled_flights: number;
  missed_connections: number;
  missed_connection_passengers: number;
  crew_violations: number;
  crew_warnings: number;
}

export interface DelayChain {
  flight_id: string;
  tail_id: string;
  dep_delay: number;
  arr_delay: number;
  primary_cause: string;
  chain: string[];
  downstream_impacts: string[];
}

export interface TimelineEvent {
  time: string; // HH:MM
  minutes: number; // 0-1440
  type: 'CLOSURE_START' | 'CLOSURE_END' | 'FLIGHT_DEP' | 'FLIGHT_ARR' | 'CREW_ALERT' | 'CONNECTION_MISSED';
  entity_id: string;
  description: string;
  severity: 'info' | 'warning' | 'critical' | 'success';
}

export interface SimulationResult {
  scenario_id: string;
  scenario_name: string;
  airport_id: string;
  closure_start: string;
  closure_duration_minutes: number;
  affected_flights: FlightResult[];
  all_flights: FlightResult[];
  missed_connections: ConnectionResult[];
  all_connections: ConnectionResult[];
  crew_status: CrewStatus[];
  metrics: OperationalMetrics;
  delay_chain: DelayChain[];
  timeline_events: TimelineEvent[];
}

export interface BaselineState {
  flights: FlightResult[];
  connections: ConnectionResult[];
  crew_status: CrewStatus[];
  metrics: OperationalMetrics;
}

export interface RecoveryEvaluation {
  action_type: 'CANCEL_FLIGHT' | 'SUBSTITUTE_AIRCRAFT';
  target_flight_id: string;
  spare_tail_id?: string;
  feasible: boolean;
  reason: string;
  warnings: string[];
  before_metrics: OperationalMetrics;
  after_metrics: OperationalMetrics;
  impact_summary: string;
}

export interface Scenario {
  scenario_id: string;
  scenario_name: string;
  airport_id: string;
  closure_start: string;
  closure_duration_minutes: number;
  created_at?: string;
  metrics?: OperationalMetrics;
  result?: SimulationResult;
}

export interface RunSimulationParams {
  airport_id: string;
  closure_start: string;
  closure_duration_minutes: number;
  scenario_name?: string;
}

export interface RecoveryActionParams {
  scenario_id: string;
  action_type: 'CANCEL_FLIGHT' | 'SUBSTITUTE_AIRCRAFT';
  target_flight_id: string;
  spare_tail_id?: string;
}
