import React from 'react';
import { FlightResult } from '../../types';
import { Badge } from '../ui/Badge';
import { X, Plane, Clock, Users, Dna, ArrowRight } from 'lucide-react';

interface FlightDetailPanelProps {
  flight: FlightResult;
  onClose: () => void;
  onOpenDNA: () => void;
  onSelectTail?: (tailId: string) => void;
}

export const FlightDetailPanel: React.FC<FlightDetailPanelProps> = ({
  flight,
  onClose,
  onOpenDNA,
  onSelectTail,
}) => {
  return (
    <div className="bg-[#151F30] border border-[#1F2E47] rounded-lg p-4 shadow-xl">
      <div className="flex items-start justify-between pb-3 border-b border-[#1F2E47]">
        <div className="flex items-center gap-2">
          <Plane className="w-5 h-5 text-[#35B6F6]" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-bold text-[#E8EEF8]">
                {flight.flight_id}
              </span>
              <Badge status={flight.status} size="sm" />
            </div>
            <p className="text-xs text-[#91A0B8]">
              {flight.origin} → {flight.destination}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-[#91A0B8] hover:text-[#E8EEF8] rounded hover:bg-[#1B293F]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="py-3 space-y-2 text-xs font-mono">
        <div className="flex justify-between items-center bg-[#101827] p-2 rounded">
          <span className="text-[#91A0B8]">Aircraft Tail:</span>
          <button
            onClick={() => onSelectTail && onSelectTail(flight.tail_id)}
            className="text-[#35B6F6] font-bold hover:underline"
          >
            {flight.tail_id}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-[#101827] p-2 rounded">
            <span className="text-[10px] text-[#91A0B8] block">DEP (SCHED / ACT)</span>
            <span className="text-[#E8EEF8]">
              {flight.scheduled_dep} →{' '}
              <strong className={flight.dep_delay_minutes > 0 ? 'text-[#F5B942]' : 'text-[#36D6B0]'}>
                {flight.actual_dep || flight.scheduled_dep}
              </strong>
            </span>
          </div>

          <div className="bg-[#101827] p-2 rounded">
            <span className="text-[10px] text-[#91A0B8] block">ARR (SCHED / ACT)</span>
            <span className="text-[#E8EEF8]">
              {flight.scheduled_arr} →{' '}
              <strong className={flight.arr_delay_minutes > 0 ? 'text-[#F5B942]' : 'text-[#36D6B0]'}>
                {flight.actual_arr || flight.scheduled_arr}
              </strong>
            </span>
          </div>
        </div>

        <div className="flex justify-between items-center bg-[#101827] p-2 rounded">
          <span className="text-[#91A0B8]">Passengers:</span>
          <span className="text-[#E8EEF8] font-bold">{flight.pax} PAX</span>
        </div>

        {flight.dep_delay_minutes > 0 && (
          <div className="bg-[#F5B942]/10 border border-[#F5B942]/30 p-2 rounded text-[#F5B942]">
            <span className="font-bold block">Delay: +{flight.dep_delay_minutes} mins</span>
            <span className="text-[11px] text-[#91A0B8]">
              Cause: {flight.cause || 'Turnaround propagation'}
            </span>
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-[#1F2E47]">
        <button
          onClick={onOpenDNA}
          className="w-full flex items-center justify-center gap-2 py-2 bg-[#35B6F6]/10 hover:bg-[#35B6F6]/20 border border-[#35B6F6]/40 text-[#35B6F6] rounded text-xs font-mono font-semibold transition"
        >
          <Dna className="w-4 h-4" />
          <span>INSPECT DISRUPTION DNA</span>
        </button>
      </div>
    </div>
  );
};
