import React, { useState } from 'react';
import { useSimulationStore } from '../../stores/simulationStore';
import { StrategyCard } from './StrategyCard';
import { BeforeAfterComparison } from './BeforeAfterComparison';
import { FlightResult, SpareAircraft, RecoveryActionParams } from '../../types';
import { Sparkles, Ban, RefreshCw, AlertTriangle } from 'lucide-react';

export const RecoveryPanel: React.FC = () => {
  const {
    currentSimulation,
    spareAircraft,
    evaluateRecovery,
    applyRecovery,
    recoveryResult,
    isEvaluatingRecovery,
    isApplyingRecovery,
  } = useSimulationStore();

  const [activeTab, setActiveTab] = useState<'all' | 'substitutions' | 'cancellations'>('all');
  const [lastAppliedAction, setLastAppliedAction] = useState<string | null>(null);

  if (!currentSimulation) {
    return (
      <div className="bg-[#151F30] border border-[#1F2E47] rounded-lg p-8 text-center">
        <Sparkles className="w-10 h-10 text-[#35B6F6] mx-auto mb-3 opacity-60" />
        <h3 className="font-mono text-base font-bold text-[#E8EEF8]">
          AI Dispatcher Standby
        </h3>
        <p className="text-xs text-[#91A0B8] mt-1 max-w-md mx-auto">
          No active disruption scenario is currently running. Please launch a scenario from
          Disruption Control or click "Run Demo" in the top bar to generate recovery strategies.
        </p>
      </div>
    );
  }

  // Identify delayed flights suitable for cancellation
  const delayedFlights = currentSimulation.affected_flights
    .filter((f) => f.dep_delay_minutes > 0 && f.status !== 'CANCELLED')
    .sort((a, b) => b.dep_delay_minutes - a.dep_delay_minutes);

  // Identify substitution opportunities:
  // Pair delayed flights originating from spare aircraft bases (e.g. BLR, DEL)
  const substitutionCandidates = delayedFlights
    .map((flight) => {
      const match = spareAircraft.find((spare) => spare.base === flight.origin);
      return match ? { flight, spare: match } : null;
    })
    .filter(Boolean) as { flight: FlightResult; spare: SpareAircraft }[];

  const handleEvaluate = async (
    actionType: 'CANCEL_FLIGHT' | 'SUBSTITUTE_AIRCRAFT',
    flightId: string,
    spareTailId?: string
  ) => {
    const params: RecoveryActionParams = {
      scenario_id: currentSimulation.scenario_id,
      action_type: actionType,
      target_flight_id: flightId,
      spare_tail_id: spareTailId,
    };
    await evaluateRecovery(params);
  };

  const handleApply = async (
    actionType: 'CANCEL_FLIGHT' | 'SUBSTITUTE_AIRCRAFT',
    flightId: string,
    spareTailId?: string
  ) => {
    const params: RecoveryActionParams = {
      scenario_id: currentSimulation.scenario_id,
      action_type: actionType,
      target_flight_id: flightId,
      spare_tail_id: spareTailId,
    };
    await applyRecovery(params);
    setLastAppliedAction(
      actionType === 'CANCEL_FLIGHT'
        ? `Cancelled Flight ${flightId}`
        : `Substituted ${flightId} with ${spareTailId}`
    );
  };

  return (
    <div className="space-y-6">
      {/* Before / After Audit (if an evaluation or applied action is available) */}
      {recoveryResult && (
        <BeforeAfterComparison
          beforeMetrics={recoveryResult.before_metrics}
          afterMetrics={recoveryResult.after_metrics}
          actionTitle={
            recoveryResult.action_type === 'CANCEL_FLIGHT'
              ? `Evaluate Cancellation: ${recoveryResult.target_flight_id}`
              : `Evaluate Aircraft Swap: ${recoveryResult.target_flight_id} → ${recoveryResult.spare_tail_id}`
          }
        />
      )}

      {/* Disruption & Spare Fleet Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
        <div className="bg-[#151F30] border border-[#1F2E47] p-4 rounded-lg">
          <span className="text-[#91A0B8] block text-[10px] uppercase">Active Disruption</span>
          <span className="text-base font-bold text-[#F05B67]">
            {currentSimulation.airport_id} Ground Stop
          </span>
          <span className="text-[11px] text-[#91A0B8] block mt-1">
            {currentSimulation.closure_start} ({currentSimulation.closure_duration_minutes}m)
          </span>
        </div>

        <div className="bg-[#151F30] border border-[#1F2E47] p-4 rounded-lg">
          <span className="text-[#91A0B8] block text-[10px] uppercase">Delayed Flights</span>
          <span className="text-base font-bold text-[#F5B942]">
            {delayedFlights.length} Flights
          </span>
          <span className="text-[11px] text-[#91A0B8] block mt-1">
            Total {currentSimulation.metrics.total_delay_minutes} mins delay
          </span>
        </div>

        <div className="bg-[#151F30] border border-[#1F2E47] p-4 rounded-lg">
          <span className="text-[#91A0B8] block text-[10px] uppercase">Spares on Standby</span>
          <span className="text-base font-bold text-[#35B6F6]">
            {spareAircraft.length} Aircraft
          </span>
          <span className="text-[11px] text-[#91A0B8] block mt-1">
            {spareAircraft.map((s) => `${s.tail_id} (${s.base})`).join(', ')}
          </span>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 border-b border-[#1F2E47] pb-3">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition ${
            activeTab === 'all'
              ? 'bg-[#35B6F6] text-[#080D18]'
              : 'text-[#91A0B8] hover:bg-[#151F30] hover:text-[#E8EEF8]'
          }`}
        >
          All Recommendations
        </button>
        <button
          onClick={() => setActiveTab('substitutions')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition ${
            activeTab === 'substitutions'
              ? 'bg-[#35B6F6] text-[#080D18]'
              : 'text-[#91A0B8] hover:bg-[#151F30] hover:text-[#E8EEF8]'
          }`}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Aircraft Swaps ({substitutionCandidates.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('cancellations')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition ${
            activeTab === 'cancellations'
              ? 'bg-[#35B6F6] text-[#080D18]'
              : 'text-[#91A0B8] hover:bg-[#151F30] hover:text-[#E8EEF8]'
          }`}
        >
          <Ban className="w-3.5 h-3.5" />
          <span>Flight Cancellations ({delayedFlights.length})</span>
        </button>
      </div>

      {/* Strategy Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Substitutions */}
        {(activeTab === 'all' || activeTab === 'substitutions') &&
          substitutionCandidates.map(({ flight, spare }) => (
            <StrategyCard
              key={`sub-${flight.flight_id}-${spare.tail_id}`}
              actionType="SUBSTITUTE_AIRCRAFT"
              targetFlight={flight}
              spareAircraft={spare}
              evaluation={
                recoveryResult?.target_flight_id === flight.flight_id &&
                recoveryResult.action_type === 'SUBSTITUTE_AIRCRAFT'
                  ? recoveryResult
                  : null
              }
              isEvaluating={isEvaluatingRecovery}
              isApplying={isApplyingRecovery}
              onEvaluate={() =>
                handleEvaluate('SUBSTITUTE_AIRCRAFT', flight.flight_id, spare.tail_id)
              }
              onApply={() =>
                handleApply('SUBSTITUTE_AIRCRAFT', flight.flight_id, spare.tail_id)
              }
            />
          ))}

        {/* Cancellations */}
        {(activeTab === 'all' || activeTab === 'cancellations') &&
          delayedFlights.map((flight) => (
            <StrategyCard
              key={`cancel-${flight.flight_id}`}
              actionType="CANCEL_FLIGHT"
              targetFlight={flight}
              evaluation={
                recoveryResult?.target_flight_id === flight.flight_id &&
                recoveryResult.action_type === 'CANCEL_FLIGHT'
                  ? recoveryResult
                  : null
              }
              isEvaluating={isEvaluatingRecovery}
              isApplying={isApplyingRecovery}
              onEvaluate={() => handleEvaluate('CANCEL_FLIGHT', flight.flight_id)}
              onApply={() => handleApply('CANCEL_FLIGHT', flight.flight_id)}
            />
          ))}
      </div>
    </div>
  );
};
