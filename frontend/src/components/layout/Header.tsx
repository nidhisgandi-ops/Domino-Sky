import React from 'react';
import { clsx } from 'clsx';
import { Play, RotateCcw, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useSimulationStore } from '../../stores/simulationStore';
import { StatusIndicator } from '../ui/StatusIndicator';

export const Header: React.FC = () => {
  const { currentSimulation, runSimulation, resetSimulation, isLoading } =
    useSimulationStore();

  const handleRunDemo = async () => {
    try {
      await runSimulation({
        airport_id: 'BOM',
        closure_start: '08:00',
        closure_duration_minutes: 90,
        scenario_name: 'BOM Hub 90m Runway Closure (Demo)',
      });
    } catch {
      // Handled in store
    }
  };

  return (
    <header className="h-16 bg-[#101827] border-b border-[#1F2E47] px-6 flex items-center justify-between shrink-0">
      {/* Left: Operational State & Scenario */}
      <div className="flex items-center gap-4">
        <StatusIndicator
          status={currentSimulation ? 'disrupted' : 'online'}
          label={currentSimulation ? `DISRUPTED: ${currentSimulation.airport_id}` : 'BASELINE OPS'}
        />

        {currentSimulation && (
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-[#151F30] border border-[#F05B67]/30 rounded text-xs text-[#E8EEF8]">
            <AlertTriangle className="w-3.5 h-3.5 text-[#F05B67]" />
            <span>
              Scenario: <strong>{currentSimulation.scenario_name}</strong> ({currentSimulation.closure_start} + {currentSimulation.closure_duration_minutes}m)
            </span>
          </div>
        )}
      </div>

      {/* Right: Quick Actions & Time Context */}
      <div className="flex items-center gap-3">
        {/* Operating Context */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-[#080D18] border border-[#1F2E47] rounded text-xs text-[#91A0B8] font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-[#36D6B0]" />
          <span>DAY 1 • IST (UTC+05:30)</span>
        </div>

        {/* Run Demo Scenario Button */}
        <button
          onClick={handleRunDemo}
          disabled={isLoading}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition border',
            isLoading
              ? 'opacity-50 cursor-not-allowed bg-[#151F30] border-[#1F2E47] text-[#91A0B8]'
              : 'bg-[#35B6F6]/10 hover:bg-[#35B6F6]/20 border-[#35B6F6]/50 text-[#35B6F6]'
          )}
        >
          <Play className="w-3 h-3 fill-current" />
          <span>{isLoading ? 'Running...' : 'Run Demo'}</span>
        </button>

        {/* Reset Simulation Button */}
        {currentSimulation && (
          <button
            onClick={resetSimulation}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#151F30] hover:bg-[#1B293F] border border-[#1F2E47] text-[#91A0B8] hover:text-[#E8EEF8] rounded text-xs font-medium uppercase tracking-wider transition"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}
      </div>
    </header>
  );
};
