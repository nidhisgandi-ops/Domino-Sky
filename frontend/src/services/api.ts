import {
  Airport,
  Flight,
  Crew,
  SpareAircraft,
  Connection,
  BaselineState,
  SimulationResult,
  RecoveryEvaluation,
  Scenario,
  RunSimulationParams,
  RecoveryActionParams,
  FlightResult,
  ConnectionResult,
  CrewStatus,
  OperationalMetrics,
  DelayChain,
  TimelineEvent,
} from '../types';

const BASE_URL = '/api';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorText = await res.text().catch(() => res.statusText);
    let parsedMessage = errorText;
    try {
      const parsed = JSON.parse(errorText);
      parsedMessage = parsed.detail || parsed.message || errorText;
    } catch {
      // Keep original text
    }
    throw new Error(`API Error (${res.status}): ${parsedMessage}`);
  }
  return res.json() as Promise<T>;
}

// Normalizer for flight results
function normalizeFlightResult(raw: any): FlightResult {
  const schedDep = raw.scheduled_departure || raw.scheduled_dep || '00:00';
  const schedArr = raw.scheduled_arrival || raw.scheduled_arr || '00:00';
  const actDep = raw.actual_departure ?? raw.actual_dep ?? null;
  const actArr = raw.actual_arrival ?? raw.actual_arr ?? null;
  const depDelay = raw.departure_delay_minutes ?? raw.delay_minutes ?? raw.dep_delay_minutes ?? 0;
  const arrDelay = raw.arrival_delay_minutes ?? raw.arr_delay_minutes ?? 0;

  return {
    flight_id: raw.flight_id,
    tail_id: raw.tail_id,
    origin: raw.origin,
    destination: raw.destination,
    scheduled_dep: schedDep,
    scheduled_arr: schedArr,
    actual_dep: actDep,
    actual_arr: actArr,
    dep_delay_minutes: depDelay,
    arr_delay_minutes: arrDelay,
    status: raw.is_cancelled || raw.status === 'CANCELLED'
      ? 'CANCELLED'
      : depDelay > 0
      ? 'DELAYED'
      : 'ON_TIME',
    cause: raw.primary_cause || raw.cause || null,
    cause_chain: raw.cause_chain || [],
    pax: raw.pax ?? 0,
  };
}

// Normalizer for metrics
function normalizeMetrics(raw: any, missedConnectionsCount: number = 0, crewWarningsCount: number = 0): OperationalMetrics {
  if (!raw) {
    return {
      delayed_flights: 0,
      total_delay_minutes: 0,
      cancelled_flights: 0,
      missed_connections: 0,
      missed_connection_passengers: 0,
      crew_violations: 0,
      crew_warnings: 0,
    };
  }
  return {
    delayed_flights: raw.delayed_count ?? raw.delayed_flights ?? 0,
    total_delay_minutes: raw.total_delay_minutes ?? 0,
    cancelled_flights: raw.cancelled_flights ?? 0,
    missed_connections: missedConnectionsCount || (raw.missed_connections ?? 0),
    missed_connection_passengers: raw.missed_connection_passengers ?? 0,
    crew_violations: raw.crew_violations ?? 0,
    crew_warnings: crewWarningsCount || (raw.crew_warnings ?? 0),
  };
}

// Normalizer for connections
function normalizeConnection(raw: any): ConnectionResult {
  const isMissed = raw.is_missed === true || raw.status === 'MISSED';
  const slack = raw.actual_slack_minutes ?? null;
  const minConnect = raw.min_connect_minutes ?? 45;

  let status: 'FEASIBLE' | 'MISSED' | 'AT_RISK' | 'DISRUPTED' = 'FEASIBLE';
  if (isMissed) {
    status = 'MISSED';
  } else if (slack !== null && slack < minConnect + 20) {
    status = 'AT_RISK';
  }

  return {
    connection_id: raw.connection_id,
    airport: raw.airport,
    from_flight: raw.from_flight,
    to_flight: raw.to_flight,
    passengers: raw.passengers,
    min_connect_minutes: minConnect,
    actual_slack_minutes: slack,
    status,
  };
}

// Normalizer for crews
function normalizeCrew(raw: any): CrewStatus {
  const isViolation = raw.violation === true || raw.status === 'VIOLATION';
  const remaining = raw.slack_mins ?? raw.remaining_duty_mins ?? (raw.max_duty_mins - (raw.actual_duty_mins ?? 0));
  const isWarning = !isViolation && remaining !== null && remaining < 60;

  return {
    crew_id: raw.crew_id,
    tail_id: raw.tail_id,
    base: raw.base,
    duty_start: raw.duty_start,
    max_duty_mins: raw.max_duty_mins ?? 600,
    actual_duty_mins: raw.actual_duty_mins ?? null,
    last_flight_actual_arr: raw.actual_last_flight_arr ?? raw.last_flight_actual_arr ?? null,
    remaining_duty_mins: remaining,
    status: isViolation ? 'VIOLATION' : isWarning ? 'WARNING' : 'OK',
  };
}

// Normalizer for simulation result
function normalizeSimulationResult(raw: any): SimulationResult {
  const allFlights: FlightResult[] = (raw.affected_flights || raw.all_flights || []).map(normalizeFlightResult);
  const affectedFlights = allFlights.filter((f) => f.dep_delay_minutes > 0 || f.status === 'CANCELLED');

  const allConnections: ConnectionResult[] = (raw.missed_connections || raw.connections || raw.all_connections || []).map(normalizeConnection);
  const missedConnections = allConnections.filter((c) => c.status === 'MISSED');

  const crewStatus: CrewStatus[] = (raw.crew_status || []).map(normalizeCrew);
  const crewWarnings = crewStatus.filter((c) => c.status === 'WARNING').length;

  const metrics = normalizeMetrics(raw.metrics, missedConnections.length, crewWarnings);

  // Construct delay chains
  const delayChains: DelayChain[] = [];
  const delayMap = raw.delay_chain || {};

  allFlights.forEach((f) => {
    if (f.dep_delay_minutes > 0) {
      const chain = Array.isArray(delayMap[f.flight_id]) ? delayMap[f.flight_id] : f.cause_chain || [];
      // Find downstream flights on the same tail
      const downstream = allFlights
        .filter((down) => down.tail_id === f.tail_id && down.scheduled_dep > f.scheduled_dep && down.dep_delay_minutes > 0)
        .map((down) => down.flight_id);

      delayChains.push({
        flight_id: f.flight_id,
        tail_id: f.tail_id,
        dep_delay: f.dep_delay_minutes,
        arr_delay: f.arr_delay_minutes,
        primary_cause: f.cause || 'DELAYED',
        chain,
        downstream_impacts: downstream,
      });
    }
  });

  // Construct timeline events
  const timelineEvents: TimelineEvent[] = (raw.timeline_events || []).map((evt: any) => {
    let type: TimelineEvent['type'] = 'FLIGHT_DEP';
    let severity: TimelineEvent['severity'] = 'info';

    if (evt.event_type === 'AIRPORT_CLOSED') {
      type = 'CLOSURE_START';
      severity = 'critical';
    } else if (evt.event_type === 'AIRPORT_OPENED') {
      type = 'CLOSURE_END';
      severity = 'success';
    } else if (evt.event_type === 'ARRIVAL') {
      type = 'FLIGHT_ARR';
      severity = evt.details?.delay > 0 ? 'warning' : 'info';
    } else if (evt.event_type === 'DEPARTURE') {
      type = 'FLIGHT_DEP';
      severity = evt.details?.delay > 0 ? 'warning' : 'info';
    } else if (evt.event_type === 'MISSED_CONNECTION') {
      type = 'CONNECTION_MISSED';
      severity = 'critical';
    } else if (evt.event_type === 'CREW_VIOLATION') {
      type = 'CREW_ALERT';
      severity = 'critical';
    } else if (evt.event_type === 'CANCELLATION') {
      type = 'FLIGHT_DEP';
      severity = 'critical';
    }

    return {
      time: evt.time || '00:00',
      minutes: evt.time_mins ?? 0,
      type,
      entity_id: evt.flight_id || evt.airport_id || '',
      description: evt.description || '',
      severity,
    };
  });

  return {
    scenario_id: raw.scenario_id || 'sim_default',
    scenario_name: raw.scenario_name || `${raw.airport_id || 'Network'} Disruption`,
    airport_id: raw.airport_id || '',
    closure_start: raw.closure_start || '08:00',
    closure_duration_minutes: raw.closure_duration_minutes ?? 90,
    affected_flights: affectedFlights,
    all_flights: allFlights,
    missed_connections: missedConnections,
    all_connections: allConnections,
    crew_status: crewStatus,
    metrics,
    delay_chain: delayChains,
    timeline_events: timelineEvents,
  };
}

export const api = {
  // Baseline & Static Data
  async getBaseline(): Promise<BaselineState> {
    const res = await fetch(`${BASE_URL}/baseline`);
    const raw = await handleResponse<any>(res);
    const sim = normalizeSimulationResult(raw);
    return {
      flights: sim.all_flights,
      connections: sim.all_connections,
      crew_status: sim.crew_status,
      metrics: sim.metrics,
    };
  },

  async getAirports(): Promise<Airport[]> {
    const res = await fetch(`${BASE_URL}/airports`);
    return handleResponse<Airport[]>(res);
  },

  async getFlights(): Promise<Flight[]> {
    const res = await fetch(`${BASE_URL}/flights`);
    return handleResponse<Flight[]>(res);
  },

  async getCrews(): Promise<Crew[]> {
    const res = await fetch(`${BASE_URL}/crews`);
    return handleResponse<Crew[]>(res);
  },

  async getSpareAircraft(): Promise<SpareAircraft[]> {
    const res = await fetch(`${BASE_URL}/spare-aircraft`);
    return handleResponse<SpareAircraft[]>(res);
  },

  async getConnections(): Promise<Connection[]> {
    const res = await fetch(`${BASE_URL}/connections`);
    return handleResponse<Connection[]>(res);
  },

  // Simulation
  async runSimulation(params: RunSimulationParams): Promise<SimulationResult> {
    const res = await fetch(`${BASE_URL}/simulation/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const raw = await handleResponse<any>(res);
    return normalizeSimulationResult(raw);
  },

  // Recovery Engine
  async evaluateRecovery(params: RecoveryActionParams): Promise<RecoveryEvaluation> {
    const res = await fetch(`${BASE_URL}/recovery/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const raw = await handleResponse<any>(res);
    return {
      action_type: raw.action_type,
      target_flight_id: raw.target_flight_id,
      spare_tail_id: raw.spare_tail_id,
      feasible: raw.is_feasible ?? raw.feasible ?? true,
      reason: raw.infeasibility_reason || raw.explanation || 'Evaluated successfully.',
      warnings: raw.disclaimer ? [raw.disclaimer] : [],
      before_metrics: normalizeMetrics(raw.before_metrics),
      after_metrics: normalizeMetrics(raw.after_metrics),
      impact_summary: raw.explanation || 'Recovery action evaluated.',
    };
  },

  async applyRecovery(params: RecoveryActionParams): Promise<SimulationResult> {
    const res = await fetch(`${BASE_URL}/recovery/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const raw = await handleResponse<any>(res);
    return normalizeSimulationResult(raw);
  },

  // Scenarios
  async getScenarios(): Promise<Scenario[]> {
    const res = await fetch(`${BASE_URL}/scenarios`);
    const rawList = await handleResponse<any[]>(res);
    return rawList.map((s) => ({
      scenario_id: s.scenario_id,
      scenario_name: s.scenario_name,
      airport_id: s.airport_id,
      closure_start: s.closure_start,
      closure_duration_minutes: s.closure_duration_minutes,
      created_at: s.created_at,
      metrics: normalizeMetrics(s.metrics),
    }));
  },

  async createScenario(params: RunSimulationParams): Promise<Scenario> {
    const payload = {
      scenario_name: params.scenario_name || `${params.airport_id} Closure ${params.closure_duration_minutes}m`,
      airport_id: params.airport_id,
      closure_start: params.closure_start,
      closure_duration_minutes: params.closure_duration_minutes,
    };
    const res = await fetch(`${BASE_URL}/scenarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const s = await handleResponse<any>(res);
    return {
      scenario_id: s.scenario_id,
      scenario_name: s.scenario_name,
      airport_id: s.airport_id,
      closure_start: s.closure_start,
      closure_duration_minutes: s.closure_duration_minutes,
      created_at: s.created_at,
      metrics: normalizeMetrics(s.metrics),
    };
  },

  async deleteScenario(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${BASE_URL}/scenarios/${id}`, {
      method: 'DELETE',
    });
    await handleResponse<any>(res);
    return { success: true };
  },
};
