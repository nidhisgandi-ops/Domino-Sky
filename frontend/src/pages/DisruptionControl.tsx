import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSimulationStore } from '../stores/simulationStore';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { MetricCard } from '../components/ui/MetricCard';
import {
  AlertOctagon,
  Clock,
  Play,
  RotateCcw,
  Sparkles,
  CheckCircle,
  Building2,
  ArrowRight,
  Sliders,
  AlertTriangle,
} from 'lucide-react';

export const DisruptionControl: React.FC = () => {
  const navigate = useNavigate();
  const {
    airports,
    currentSimulation,
    runSimulation,
    resetSimulation,
    isLoading,
    error,
  } = useSimulationStore();

  const [selectedAirportId, setSelectedAirportId] = useState<string>('BOM');
  const [closureStartTime, setClosureStartTime] = useState<string>('08:00');
  const [closureDuration, setClosureDuration] = useState<number>(90);
  const [scenarioName, setScenarioName] = useState<string>('BOM Runway Closure (90m)');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Auto calculate closure end time in HH:MM
  const closureEndTime = useMemo(() => {
    if (!closureStartTime || !closureStartTime.includes(':')) return '--:--';
    const [h, m] = closureStartTime.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return '--:--';

    const totalMinutes = h * 60 + m + closureDuration;
    const endH = Math.floor(totalMinutes / 60) % 24;
    const endM = totalMinutes % 60;
    return `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
  }, [closureStartTime, closureDuration]);

  // Validation
  const validateForm = () => {
    if (!selectedAirportId) {
      setValidationError('Please select an airport hub to close.');
      return false;
    }
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(closureStartTime)) {
      setValidationError('Closure start time must be in 24-hour HH:MM format (e.g. 08:00).');
      return false;
    }
    if (closureDuration < 15 || closureDuration > 480) {
      setValidationError('Duration must be between 15 and 480 minutes.');
      return false;
    }
    setValidationError(null);
    return true;
  };

  const handleRunSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      await runSimulation({
        airport_id: selectedAirportId,
        closure_start: closureStartTime,
        closure_duration_minutes: closureDuration,
        scenario_name: scenarioName || `${selectedAirportId} Ground Stop (${closureDuration}m)`,
      });
    } catch {
      // Handled in store
    }
  };

  const handleLoadDemo = () => {
    setSelectedAirportId('BOM');
    setClosureStartTime('08:00');
    setClosureDuration(90);
    setScenarioName('BOM Hub 90m Runway Closure (Demo)');
    setValidationError(null);
  };

  const targetAirport = airports.find((a) => a.id === selectedAirportId);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#101827] border border-[#1F2E47] p-4 rounded-lg">
        <div>
          <h1 className="text-xl font-mono font-bold text-[#E8EEF8] flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-[#F05B67]" />
            Disruption Control Room
          </h1>
          <p className="text-xs text-[#91A0B8] mt-0.5 font-mono">
            Inject stochastic airport ground stops and observe deterministic cascade propagation.
          </p>
        </div>

        <button
          onClick={handleLoadDemo}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#151F30] hover:bg-[#1B293F] border border-[#35B6F6]/50 text-[#35B6F6] text-xs font-mono font-bold uppercase rounded-lg transition"
        >
          <Sparkles className="w-4 h-4" />
          <span>Load Demo Scenario</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Form: Disruption Parameters (2 Cols) */}
        <div className="md:col-span-2">
          <Card title="Airport Closure Parameters" subtitle="Configure ground stop window">
            <form onSubmit={handleRunSimulation} className="space-y-5">
              {validationError && (
                <div className="p-3 bg-[#F05B67]/15 border border-[#F05B67]/40 rounded-lg text-xs font-mono text-[#F05B67] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}

              {/* Scenario Name */}
              <div>
                <label className="block text-xs font-mono font-semibold text-[#91A0B8] uppercase mb-1.5">
                  Scenario Label
                </label>
                <input
                  type="text"
                  value={scenarioName}
                  onChange={(e) => setScenarioName(e.target.value)}
                  placeholder="e.g. BOM Morning Fog Ground Stop"
                  className="w-full px-3 py-2 bg-[#101827] border border-[#1F2E47] rounded-lg text-sm font-mono text-[#E8EEF8] focus:outline-none focus:border-[#35B6F6]"
                />
              </div>

              {/* Airport Hub Selector */}
              <div>
                <label className="block text-xs font-mono font-semibold text-[#91A0B8] uppercase mb-1.5">
                  Target Airport Hub (16 Airspace Nodes)
                </label>
                <select
                  value={selectedAirportId}
                  onChange={(e) => {
                    setSelectedAirportId(e.target.value);
                    setScenarioName(`${e.target.value} Disruption (${closureDuration}m)`);
                  }}
                  className="w-full px-3 py-2 bg-[#101827] border border-[#1F2E47] rounded-lg text-sm font-mono text-[#E8EEF8] focus:outline-none focus:border-[#35B6F6]"
                >
                  {airports.map((apt) => (
                    <option key={apt.id} value={apt.id}>
                      {apt.id} — {apt.city} ({apt.name}) [{apt.tier.replace('_', ' ')}]
                    </option>
                  ))}
                </select>
                {targetAirport && (
                  <p className="text-[11px] text-[#91A0B8] font-mono mt-1">
                    Hub Tier: <span className="text-[#35B6F6] uppercase">{targetAirport.tier}</span> • Capacity: {targetAirport.capacity_per_hour} mvts/hr
                  </p>
                )}
              </div>

              {/* Closure Window: Start Time & Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono font-semibold text-[#91A0B8] uppercase mb-1.5">
                    Closure Start Time (IST, 24-Hour)
                  </label>
                  <div className="relative">
                    <Clock className="w-4 h-4 absolute left-3 top-2.5 text-[#91A0B8]" />
                    <input
                      type="text"
                      value={closureStartTime}
                      onChange={(e) => setClosureStartTime(e.target.value)}
                      placeholder="HH:MM (e.g. 08:00)"
                      pattern="^([01]\d|2[0-3]):([0-5]\d)$"
                      className="w-full pl-9 pr-3 py-2 bg-[#101827] border border-[#1F2E47] rounded-lg text-sm font-mono text-[#E8EEF8] focus:outline-none focus:border-[#35B6F6]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono font-semibold text-[#91A0B8] uppercase mb-1.5">
                    Calculated Re-opening Time
                  </label>
                  <div className="px-3 py-2 bg-[#101827] border border-[#1F2E47] rounded-lg text-sm font-mono text-[#36D6B0] font-bold">
                    {closureEndTime} IST
                  </div>
                </div>
              </div>

              {/* Closure Duration Slider */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-mono font-semibold text-[#91A0B8] uppercase">
                    Closure Duration
                  </label>
                  <span className="font-mono text-sm font-bold text-[#F5B942]">
                    {closureDuration} minutes (~{Math.round((closureDuration / 60) * 10) / 10} hrs)
                  </span>
                </div>
                <input
                  type="range"
                  min={15}
                  max={480}
                  step={15}
                  value={closureDuration}
                  onChange={(e) => {
                    const dur = Number(e.target.value);
                    setClosureDuration(dur);
                    setScenarioName(`${selectedAirportId} Disruption (${dur}m)`);
                  }}
                  className="w-full h-2 bg-[#101827] rounded-lg appearance-none cursor-pointer accent-[#35B6F6]"
                />
                <div className="flex justify-between text-[10px] font-mono text-[#91A0B8] mt-1">
                  <span>15m</span>
                  <span>120m (2h)</span>
                  <span>240m (4h)</span>
                  <span>360m (6h)</span>
                  <span>480m (8h)</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-3 border-t border-[#1F2E47]">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-2.5 px-4 bg-[#35B6F6] hover:bg-[#35B6F6]/90 disabled:opacity-50 text-[#080D18] rounded-lg font-mono font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>{isLoading ? 'Computing Cascade Engine...' : 'Start Simulation'}</span>
                </button>

                <button
                  type="button"
                  onClick={resetSimulation}
                  className="py-2.5 px-4 bg-[#101827] hover:bg-[#1B293F] border border-[#1F2E47] text-[#91A0B8] hover:text-[#E8EEF8] rounded-lg font-mono text-xs uppercase transition flex items-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset</span>
                </button>
              </div>
            </form>
          </Card>
        </div>

        {/* Right Panel: Active Scenario Overview & Simulation Method */}
        <div className="space-y-4">
          <Card title="Active Scenario Summary">
            {currentSimulation ? (
              <div className="space-y-3 font-mono text-xs">
                <div className="p-3 bg-[#101827] rounded border border-[#F05B67]/30">
                  <span className="text-[10px] text-[#91A0B8] uppercase block">Current Active Hub</span>
                  <span className="text-lg font-bold text-[#F05B67]">
                    {currentSimulation.airport_id} Ground Stop
                  </span>
                  <span className="text-xs text-[#91A0B8] block mt-0.5">
                    {currentSimulation.closure_start} - {currentSimulation.closure_duration_minutes}m duration
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[#91A0B8]">Delayed Flights:</span>
                    <span className="text-[#F5B942] font-bold">
                      {currentSimulation.metrics.delayed_flights}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#91A0B8]">Cumulative Delay:</span>
                    <span className="text-[#F5B942] font-bold">
                      {currentSimulation.metrics.total_delay_minutes} mins
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#91A0B8]">Missed Connections:</span>
                    <span className="text-[#F05B67] font-bold">
                      {currentSimulation.metrics.missed_connections}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#91A0B8]">Crew Violations:</span>
                    <span className="text-[#F05B67] font-bold">
                      {currentSimulation.metrics.crew_violations}
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => navigate('/cascade')}
                    className="w-full py-2 bg-[#151F30] hover:bg-[#1B293F] border border-[#35B6F6]/50 text-[#35B6F6] rounded text-xs font-bold uppercase transition flex items-center justify-center gap-1.5"
                  >
                    <span>View Cascade Propagation</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-[#91A0B8] font-mono">
                No active scenario loaded. Fill in parameters on the left or load demo.
              </div>
            )}
          </Card>

          <Card title="Simulation Engine Rules">
            <div className="space-y-2 text-xs text-[#91A0B8] leading-relaxed font-mono">
              <p>
                • <strong>Airport Closure:</strong> Departures and arrivals at closed hub are held until reopening.
              </p>
              <p>
                • <strong>Turnaround:</strong> Min 30m required between aircraft legs.
              </p>
              <p>
                • <strong>Connections:</strong> Slack &lt; min connection time marks connection as MISSED.
              </p>
              <p>
                • <strong>Crew Limits:</strong> Duty starts at duty_start and cannot exceed 600m max duty.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
