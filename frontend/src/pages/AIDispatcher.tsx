import React from 'react';
import { useSimulationStore } from '../stores/simulationStore';
import { RecoveryPanel } from '../components/recovery/RecoveryPanel';
import { Sparkles, Bot, ShieldCheck, AlertTriangle } from 'lucide-react';

export const AIDispatcher: React.FC = () => {
  const { currentSimulation, spareAircraft } = useSimulationStore();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#101827] border border-[#1F2E47] p-4 rounded-lg">
        <div>
          <h1 className="text-xl font-mono font-bold text-[#E8EEF8] flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#35B6F6]" />
            AI Operations Recovery Dispatcher
          </h1>
          <p className="text-xs text-[#91A0B8] mt-0.5 font-mono">
            Automated strategy generation: selective flight cancellations and standby spare substitutions.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="px-3 py-1.5 bg-[#151F30] border border-[#1F2E47] rounded-lg text-[#35B6F6]">
            {spareAircraft.length} Spares Available ({spareAircraft.map((s) => s.tail_id).join(', ')})
          </span>
        </div>
      </div>

      {/* Dataset Limitation Policy Callout */}
      <div className="bg-[#151F30] border border-[#F5B942]/30 p-4 rounded-lg flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-[#F5B942] shrink-0 mt-0.5" />
        <div className="text-xs font-mono text-[#91A0B8] space-y-1">
          <p className="text-[#F5B942] font-bold">
            Operational Constraints & Standby Policies
          </p>
          <p>
            1. <strong>No Repositioning Flights:</strong> Spares can only substitute flights departing from their home base (VT-DS17 at BLR, VT-DS18 at DEL).
          </p>
          <p>
            2. <strong>Crew Availability Unverified:</strong> Dataset does not specify reserve flight crews; substitution evaluation carries a mandatory crew verification advisory.
          </p>
        </div>
      </div>

      {/* Main Recovery Workspace */}
      <RecoveryPanel />
    </div>
  );
};
