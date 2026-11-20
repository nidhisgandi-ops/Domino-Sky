import React from 'react';
import { FlightResult } from '../../types';
import { clsx } from 'clsx';

interface AircraftRotationTimelineProps {
  flights: FlightResult[];
  selectedTailId?: string | null;
  onSelectFlight?: (flightId: string) => void;
  onSelectTail?: (tailId: string) => void;
}

export const AircraftRotationTimeline: React.FC<AircraftRotationTimelineProps> = ({
  flights,
  selectedTailId,
  onSelectFlight,
  onSelectTail,
}) => {
  // Convert HH:MM to minutes from midnight
  const parseTime = (timeStr?: string | null) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  // Group flights by aircraft tail_id and sort by leg_order
  const tails = Array.from(new Set(flights.map((f) => f.tail_id))).sort();

  const tailRotations = tails.map((tailId) => {
    const tailFlights = flights
      .filter((f) => f.tail_id === tailId)
      .sort((a, b) => parseTime(a.actual_dep || a.scheduled_dep) - parseTime(b.actual_dep || b.scheduled_dep));
    return { tailId, flights: tailFlights };
  });

  const getStatusColor = (f: FlightResult) => {
    if (f.status === 'CANCELLED' || f.status === 'BLOCKED') return 'bg-[#F05B67] text-white border-[#F05B67]';
    if (f.dep_delay_minutes > 15 || f.arr_delay_minutes > 15)
      return 'bg-[#F5B942]/20 text-[#F5B942] border-[#F5B942]/50 hover:bg-[#F5B942]/30';
    return 'bg-[#36D6B0]/20 text-[#36D6B0] border-[#36D6B0]/50 hover:bg-[#36D6B0]/30';
  };

  return (
    <div className="w-full bg-[#151F30] border border-[#1F2E47] rounded-lg p-4 overflow-x-auto">
      {/* 24-Hour Time Header */}
      <div className="min-w-[800px] mb-3">
        <div className="flex border-b border-[#1F2E47] pb-2 text-[10px] font-mono text-[#91A0B8]">
          <div className="w-24 shrink-0 font-bold uppercase">Tail ID</div>
          <div className="flex-1 grid grid-cols-12 text-center">
            <span>00:00</span>
            <span>02:00</span>
            <span>04:00</span>
            <span>06:00</span>
            <span>08:00</span>
            <span>10:00</span>
            <span>12:00</span>
            <span>14:00</span>
            <span>16:00</span>
            <span>18:00</span>
            <span>20:00</span>
            <span>22:00</span>
          </div>
        </div>
      </div>

      {/* Rotation Rows */}
      <div className="min-w-[800px] space-y-2">
        {tailRotations.map(({ tailId, flights: tailFlights }) => {
          const isSelected = selectedTailId === tailId;

          return (
            <div
              key={tailId}
              className={clsx(
                'flex items-center h-8 rounded border transition',
                isSelected
                  ? 'bg-[#1B293F] border-[#35B6F6]'
                  : 'bg-[#101827]/60 border-[#1F2E47] hover:border-[#2D3F5E]'
              )}
            >
              {/* Tail ID Label */}
              <button
                onClick={() => onSelectTail && onSelectTail(tailId)}
                className="w-24 shrink-0 px-2 text-left font-mono text-xs font-bold text-[#E8EEF8] hover:text-[#35B6F6] truncate"
              >
                {tailId}
              </button>

              {/* Gantt Bar Track (1440 mins full width) */}
              <div className="flex-1 relative h-full">
                {/* 2-hour subtle grid lines */}
                <div className="absolute inset-0 grid grid-cols-12 pointer-events-none">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div
                      key={i}
                      className="border-r border-[#1F2E47]/30 h-full"
                    />
                  ))}
                </div>

                {/* Flight Blocks */}
                {tailFlights.map((flight) => {
                  const depMins = parseTime(flight.actual_dep || flight.scheduled_dep);
                  const arrMins = parseTime(flight.actual_arr || flight.scheduled_arr);
                  const duration = Math.max(20, arrMins - depMins);

                  const leftPct = (depMins / 1440) * 100;
                  const widthPct = (duration / 1440) * 100;

                  return (
                    <div
                      key={flight.flight_id}
                      onClick={() => onSelectFlight && onSelectFlight(flight.flight_id)}
                      title={`${flight.flight_id} (${flight.origin} → ${flight.destination})\nDep: ${flight.actual_dep || flight.scheduled_dep} | Arr: ${flight.actual_arr || flight.scheduled_arr}\nDelay: +${flight.dep_delay_minutes}m`}
                      style={{
                        left: `${leftPct}%`,
                        width: `${Math.max(widthPct, 2)}%`,
                      }}
                      className={clsx(
                        'absolute top-1 bottom-1 rounded border text-[9px] font-mono font-bold flex items-center justify-center truncate px-1 cursor-pointer transition-transform hover:scale-105 z-10',
                        getStatusColor(flight)
                      )}
                    >
                      {flight.origin}-{flight.destination}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
