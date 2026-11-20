import React, { useState, useEffect } from 'react';
import { useScenarioStore } from '../stores/scenarioStore';
import { useSimulationStore } from '../stores/simulationStore';
import { ScenarioComparisonChart } from '../components/charts/ScenarioComparisonChart';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { RunSimulationParams, Scenario } from '../types';
import {
  FlaskConical,
  Plus,
  Trash2,
  Copy,
  CheckSquare,
  Square,
  Clock,
  Layers,
  BarChart3,
  AlertTriangle,
} from 'lucide-react';

export const ScenarioLab: React.FC = () => {
  const {
    scenarios,
    loadScenarios,
    createScenario,
    deleteScenario,
    duplicateScenario,
    selectedScenarioIds,
    toggleSelectScenario,
    clearSelectedScenarios,
    isLoading: isScenarioLoading,
  } = useScenarioStore();

  const { airports, runSimulation } = useSimulationStore();

  const [airportId, setAirportId] = useState<string>('DEL');
  const [closureStart, setClosureStart] = useState<string>('09:00');
  const [duration, setDuration] = useState<number>(60);
  const [scenarioName, setScenarioName] = useState<string>('DEL Hub 60m Closure');

  useEffect(() => {
    loadScenarios();
  }, [loadScenarios]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const params: RunSimulationParams = {
      airport_id: airportId,
      closure_start: closureStart,
      closure_duration_minutes: duration,
      scenario_name: scenarioName || `${airportId} Closure (${duration}m)`,
    };
    try {
      await createScenario(params);
      // Also run it to populate results if desired
      await runSimulation(params);
    } catch {
      // Handled in store
    }
  };

  const selectedScenariosList = scenarios.filter((s) =>
    selectedScenarioIds.includes(s.scenario_id)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#101827] border border-[#1F2E47] p-4 rounded-lg">
        <div>
          <h1 className="text-xl font-mono font-bold text-[#E8EEF8] flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-[#35B6F6]" />
            Scenario Lab & What-If Sandbox
          </h1>
          <p className="text-xs text-[#91A0B8] mt-0.5 font-mono">
            Create, duplicate, and benchmark multiple closure scenarios side-by-side.
          </p>
        </div>

        {selectedScenarioIds.length > 0 && (
          <button
            onClick={clearSelectedScenarios}
            className="px-3 py-1.5 bg-[#151F30] hover:bg-[#1B293F] border border-[#1F2E47] text-xs font-mono text-[#91A0B8] rounded-lg"
          >
            Clear Selected ({selectedScenarioIds.length})
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form: Create Scenario */}
        <div className="lg:col-span-1">
          <Card title="New What-If Experiment" subtitle="Configure hypothetical closure">
            <form onSubmit={handleCreate} className="space-y-4 font-mono text-xs">
              <div>
                <label className="block text-[#91A0B8] uppercase text-[10px] mb-1">
                  Scenario Name
                </label>
                <input
                  type="text"
                  value={scenarioName}
                  onChange={(e) => setScenarioName(e.target.value)}
                  placeholder="e.g. DEL Runway Inspection"
                  className="w-full px-3 py-2 bg-[#101827] border border-[#1F2E47] rounded text-[#E8EEF8] focus:border-[#35B6F6] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[#91A0B8] uppercase text-[10px] mb-1">
                  Target Airport
                </label>
                <select
                  value={airportId}
                  onChange={(e) => {
                    setAirportId(e.target.value);
                    setScenarioName(`${e.target.value} Disruption (${duration}m)`);
                  }}
                  className="w-full px-3 py-2 bg-[#101827] border border-[#1F2E47] rounded text-[#E8EEF8] focus:border-[#35B6F6] focus:outline-none"
                >
                  {airports.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.id} — {a.city} ({a.tier})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#91A0B8] uppercase text-[10px] mb-1">
                    Start (HH:MM)
                  </label>
                  <input
                    type="text"
                    value={closureStart}
                    onChange={(e) => setClosureStart(e.target.value)}
                    placeholder="08:00"
                    className="w-full px-3 py-2 bg-[#101827] border border-[#1F2E47] rounded text-[#E8EEF8] focus:border-[#35B6F6] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[#91A0B8] uppercase text-[10px] mb-1">
                    Duration (mins)
                  </label>
                  <input
                    type="number"
                    min={15}
                    max={480}
                    step={15}
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#101827] border border-[#1F2E47] rounded text-[#E8EEF8] focus:border-[#35B6F6] focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isScenarioLoading}
                className="w-full py-2 bg-[#35B6F6] hover:bg-[#35B6F6]/90 text-[#080D18] font-bold rounded uppercase tracking-wider text-xs transition flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Create & Run Scenario</span>
              </button>
            </form>
          </Card>
        </div>

        {/* Right Col: Scenario List & Benchmarking */}
        <div className="lg:col-span-2 space-y-4">
          {/* Comparison Chart */}
          <Card
            title="Benchmark Comparison Chart"
            subtitle="Side-by-side metrics of selected scenarios"
          >
            <ScenarioComparisonChart
              scenarios={
                selectedScenariosList.length > 0 ? selectedScenariosList : scenarios
              }
            />
          </Card>

          {/* Scenarios Table */}
          <Card
            title={`Saved Scenarios Library (${scenarios.length})`}
            subtitle="Select 2+ scenarios to compare in the benchmark above"
          >
            {scenarios.length === 0 ? (
              <div className="py-8 text-center text-xs font-mono text-[#91A0B8]">
                No saved scenarios found. Create one using the form on the left.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="border-b border-[#1F2E47] text-[#91A0B8] uppercase text-[10px]">
                      <th className="py-2.5 px-3">Select</th>
                      <th className="py-2.5 px-3">Scenario</th>
                      <th className="py-2.5 px-3">Hub & Time</th>
                      <th className="py-2.5 px-3">Delayed Legs</th>
                      <th className="py-2.5 px-3">Missed Conns</th>
                      <th className="py-2.5 px-3">Total Delay</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F2E47]/50">
                    {scenarios.map((sc) => {
                      const isSelected = selectedScenarioIds.includes(sc.scenario_id);
                      const m = sc.metrics || sc.result?.metrics;

                      return (
                        <tr
                          key={sc.scenario_id}
                          className="hover:bg-[#1B293F]/50 transition"
                        >
                          <td className="py-2.5 px-3">
                            <button
                              onClick={() => toggleSelectScenario(sc.scenario_id)}
                              className="text-[#35B6F6]"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-[#35B6F6]" />
                              ) : (
                                <Square className="w-4 h-4 text-[#91A0B8]" />
                              )}
                            </button>
                          </td>
                          <td className="py-2.5 px-3 font-bold text-[#E8EEF8]">
                            {sc.scenario_name || sc.scenario_id}
                          </td>
                          <td className="py-2.5 px-3 text-[#91A0B8]">
                            <span className="text-[#F05B67] font-bold">{sc.airport_id}</span> • {sc.closure_start} ({sc.closure_duration_minutes}m)
                          </td>
                          <td className="py-2.5 px-3 text-[#F5B942]">
                            {m ? `${m.delayed_flights} flights` : '--'}
                          </td>
                          <td className="py-2.5 px-3 text-[#F05B67]">
                            {m ? `${m.missed_connections} conns` : '--'}
                          </td>
                          <td className="py-2.5 px-3 text-[#E8EEF8]">
                            {m ? `${m.total_delay_minutes}m` : '--'}
                          </td>
                          <td className="py-2.5 px-3 text-right space-x-2">
                            <button
                              onClick={() => duplicateScenario(sc.scenario_id)}
                              title="Duplicate Scenario"
                              className="p-1 text-[#91A0B8] hover:text-[#35B6F6] rounded hover:bg-[#101827]"
                            >
                              <Copy className="w-3.5 h-3.5 inline" />
                            </button>
                            <button
                              onClick={() => deleteScenario(sc.scenario_id)}
                              title="Delete Scenario"
                              className="p-1 text-[#91A0B8] hover:text-[#F05B67] rounded hover:bg-[#101827]"
                            >
                              <Trash2 className="w-3.5 h-3.5 inline" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
