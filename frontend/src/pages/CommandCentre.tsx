import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSimulationStore } from '../stores/simulationStore';
import { MetricCard } from '../components/ui/MetricCard';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { DelayBarChart } from '../components/charts/DelayBarChart';
import { AirportNetwork } from '../components/network/AirportNetwork';
import {
  Building2,
  Plane,
  Clock,
  Users,
  AlertTriangle,
  ShieldAlert,
  Play,
  RotateCcw,
  GitFork,
  ArrowRight,
  Activity,
  Layers,
} from 'lucide-react';

export const CommandCentre: React.FC = () => {
  const navigate = useNavigate();
  const {
    airports,
    flights,
    crews,
    spareAircraft,
    currentSimulation,
    baseline,
    runSimulation,
    resetSimulation,
    isLoading,
    setSelectedFlight,
  } = useSimulationStore();

  const handleRunDemo = async () => {
    try {
      await runSimulation({
        airport_id: 'BOM',
        closure_start: '08:00',
        closure_duration_minutes: 90,
        scenario_name: 'BOM Hub 90m Runway Closure (Demo)',
      });
    } catch {
      // Error handled in store
    }
  };

  const handleSelectFlight = (flightId: string) => {
    setSelectedFlight(flightId);
    navigate('/cascade');
  };

  // Fleet and operational counts
  const totalAirports = airports.length || 16;
  const totalFlights = flights.length || 70;
  const totalAircraft = new Set(flights.map((f) => f.tail_id)).size || 16;
  const totalSpares = spareAircraft.length || 2;

  // Active metrics: from simulation or baseline
  const activeMetrics = currentSimulation?.metrics || baseline?.metrics || {
    delayed_flights: 0,
    total_delay_minutes: 0,
    cancelled_flights: 0,
    missed_connections: 0,
    missed_connection_passengers: 0,
    crew_violations: 0,
    crew_warnings: 0,
  };

  const activeFlights = currentSimulation?.all_flights || baseline?.flights || [];
  const events = currentSimulation?.timeline_events || [];

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Operations Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#101827] border border-[#1F2E47] p-4 rounded-lg">
        <div>
          <h1 className="text-xl font-mono font-bold text-[#E8EEF8] flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#35B6F6]" />
            Aviation Operations Command Centre
          </h1>
          <p className="text-xs text-[#91A0B8] mt-0.5 font-mono">
            Deterministic digital twin of 70 scheduled legs, 16 hub airports, and crew duty limits.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <button
            onClick={handleRunDemo}
            disabled={isLoading}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-[#35B6F6] hover:bg-[#35B6F6]/90 text-[#080D18] rounded-lg text-xs font-mono font-bold uppercase transition"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isLoading ? 'Running Demo...' : 'Run Demo Scenario'}</span>
          </button>

          {currentSimulation && (
            <button
              onClick={resetSimulation}
              className="p-2 bg-[#151F30] hover:bg-[#1B293F] border border-[#1F2E47] text-[#91A0B8] hover:text-[#E8EEF8] rounded-lg transition"
              title="Reset Simulation"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => navigate('/cascade')}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#151F30] hover:bg-[#1B293F] border border-[#1F2E47] text-[#91A0B8] hover:text-[#E8EEF8] rounded-lg text-xs font-mono transition"
          >
            <GitFork className="w-3.5 h-3.5 text-[#35B6F6]" />
            <span>Cascade</span>
          </button>
        </div>
      </div>

      {/* Row 1: Static Operational Infrastructure */}
      <div>
        <div className="text-[11px] font-mono tracking-wider text-[#91A0B8] uppercase mb-2">
          Fleet & Airspace Assets
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            label="Total Hubs"
            value={totalAirports}
            subtext="4 Mega, 4 Reg, 8 Spoke"
            icon={Building2}
            variant="default"
            onClick={() => navigate('/network')}
          />
          <MetricCard
            label="Scheduled Flights"
            value={totalFlights}
            subtext="Single operating day"
            icon={Plane}
            variant="default"
            onClick={() => navigate('/cascade')}
          />
          <MetricCard
            label="Active Aircraft"
            value={totalAircraft}
            subtext="180-seat configuration"
            icon={Layers}
            variant="default"
          />
          <MetricCard
            label="Standby Spares"
            value={totalSpares}
            subtext="BLR & DEL hub bases"
            icon={Plane}
            variant="info"
            onClick={() => navigate('/dispatcher')}
          />
        </div>
      </div>

      {/* Row 2: Disruption & Cascade Impact Telemetry */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-mono tracking-wider text-[#91A0B8] uppercase">
            Disruption Telemetry ({currentSimulation ? currentSimulation.scenario_name : 'Nominal Baseline'})
          </span>
          {currentSimulation && (
            <Badge status="DISRUPTED" label={`${currentSimulation.airport_id} Ground Stop`} />
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            label="Delayed Flights"
            value={activeMetrics.delayed_flights}
            subtext={
              activeMetrics.delayed_flights > 0
                ? `${Math.round((activeMetrics.delayed_flights / totalFlights) * 100)}% of network schedule`
                : 'Zero flight delays'
            }
            icon={Clock}
            variant={activeMetrics.delayed_flights > 0 ? 'warning' : 'success'}
            onClick={() => navigate('/cascade')}
          />
          <MetricCard
            label="Total Delay"
            value={`${activeMetrics.total_delay_minutes}m`}
            subtext={
              activeMetrics.total_delay_minutes > 0
                ? `~${Math.round(activeMetrics.total_delay_minutes / 60)} cumulative hours`
                : 'On-schedule operations'
            }
            icon={Clock}
            variant={activeMetrics.total_delay_minutes > 0 ? 'warning' : 'success'}
          />
          <MetricCard
            label="Missed Connections"
            value={activeMetrics.missed_connections}
            subtext={`${activeMetrics.missed_connection_passengers} stranded pax`}
            icon={Users}
            variant={activeMetrics.missed_connections > 0 ? 'critical' : 'success'}
            onClick={() => navigate('/passengers')}
          />
          <MetricCard
            label="Crew Violations"
            value={activeMetrics.crew_violations}
            subtext={`${activeMetrics.crew_warnings} crew in warning zone`}
            icon={ShieldAlert}
            variant={activeMetrics.crew_violations > 0 ? 'critical' : 'success'}
            onClick={() => navigate('/crew')}
          />
        </div>
      </div>

      {/* Main Grid: Interactive Map & Telemetry Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Network Map */}
        <div className="lg:col-span-2 space-y-4">
          <Card
            title="Interactive Network Airspace Map"
            subtitle="Real-time route states, hub capacity, and ground stop closures"
            action={
              <button
                onClick={() => navigate('/network')}
                className="text-xs font-mono text-[#35B6F6] hover:underline flex items-center gap-1"
              >
                <span>Full Map</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            }
          >
            <AirportNetwork onSelectFlight={handleSelectFlight} />
          </Card>

          {/* Delay Distribution Chart */}
          <Card
            title="Top Flight Delays (Cascade Propagation)"
            subtitle="Departure delay minutes by flight leg"
            action={
              <button
                onClick={() => navigate('/cascade')}
                className="text-xs font-mono text-[#35B6F6] hover:underline flex items-center gap-1"
              >
                <span>View All Flights</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            }
          >
            <DelayBarChart flights={activeFlights} onSelectFlight={handleSelectFlight} />
          </Card>
        </div>

        {/* Right Col: Scenario Details & Real-Time Events Feed */}
        <div className="space-y-4">
          {/* Current Scenario Panel */}
          <Card
            title="Scenario Parameters"
            variant={currentSimulation ? 'warning' : 'default'}
          >
            {currentSimulation ? (
              <div className="space-y-3 font-mono text-xs">
                <div>
                  <span className="text-[10px] text-[#91A0B8] uppercase block">Scenario Name</span>
                  <span className="text-sm font-bold text-[#E8EEF8]">
                    {currentSimulation.scenario_name}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#1F2E47]">
                  <div>
                    <span className="text-[10px] text-[#91A0B8] uppercase block">Closure Hub</span>
                    <span className="text-sm font-bold text-[#F05B67]">
                      {currentSimulation.airport_id}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#91A0B8] uppercase block">Duration</span>
                    <span className="text-sm font-bold text-[#F5B942]">
                      {currentSimulation.closure_duration_minutes} mins
                    </span>
                  </div>
                </div>
                <div className="pt-2 border-t border-[#1F2E47]">
                  <span className="text-[10px] text-[#91A0B8] uppercase block">Ground Stop Window</span>
                  <span className="text-xs text-[#E8EEF8]">
                    {currentSimulation.closure_start} IST onwards
                  </span>
                </div>
                <div className="pt-2">
                  <button
                    onClick={() => navigate('/dispatcher')}
                    className="w-full py-2 bg-[#35B6F6] hover:bg-[#35B6F6]/90 text-[#080D18] font-bold rounded uppercase tracking-wider text-xs transition flex items-center justify-center gap-1.5"
                  >
                    <span>Launch AI Dispatcher</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <p className="text-[#91A0B8]">
                  Currently viewing standard undisrupted baseline. No airport closures are active.
                </p>
                <button
                  onClick={() => navigate('/disruption-control')}
                  className="w-full py-2 bg-[#101827] hover:bg-[#1B293F] border border-[#35B6F6]/50 text-[#35B6F6] font-mono font-bold rounded uppercase tracking-wider text-xs transition flex items-center justify-center gap-1.5"
                >
                  <span>Configure Disruption</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </Card>

          {/* Timeline Events Feed */}
          <Card
            title="Operational Disruption Events"
            subtitle={events.length > 0 ? `${events.length} chronological events` : 'Standing by'}
          >
            {events.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#91A0B8] font-mono">
                No active disruption events. Trigger a scenario to monitor sequence logs.
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {events.map((ev, i) => (
                  <div
                    key={i}
                    className="p-2.5 bg-[#101827] border border-[#1F2E47] rounded text-xs font-mono space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[#35B6F6] font-bold">{ev.time} IST</span>
                      <Badge
                        status={
                          ev.severity === 'critical'
                            ? 'CRITICAL'
                            : ev.severity === 'warning'
                            ? 'WARNING'
                            : 'INFO'
                        }
                        size="sm"
                      />
                    </div>
                    <p className="text-[#E8EEF8] text-[11px]">{ev.description}</p>
                    <span className="text-[10px] text-[#91A0B8]">Entity: {ev.entity_id}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
