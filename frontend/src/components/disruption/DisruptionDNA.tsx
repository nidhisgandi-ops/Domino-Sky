import React from 'react';
import { FlightResult, ConnectionResult, CrewStatus } from '../../types';
import { CausalChain } from './CausalChain';
import { Badge } from '../ui/Badge';
import { X, Plane, Clock, AlertTriangle, Users, ShieldAlert, ArrowRight } from 'lucide-react';

interface DisruptionDNAProps {
  flight: FlightResult;
  allFlights: FlightResult[];
  connections: ConnectionResult[];
  crews: CrewStatus[];
  onClose: () => void;
  onSelectFlight?: (flightId: string) => void;
}

export const DisruptionDNA: React.FC<DisruptionDNAProps> = ({
  flight,
  allFlights,
  connections,
  crews,
  onClose,
  onSelectFlight,
}) => {
  // Find flights operated by same tail
  const tailFlights = allFlights
    .filter((f) => f.tail_id === flight.tail_id)
    .sort((a, b) => (a.scheduled_dep > b.scheduled_dep ? 1 : -1));

  const currentIndex = tailFlights.findIndex((f) => f.flight_id === flight.flight_id);
  const previousFlight = currentIndex > 0 ? tailFlights[currentIndex - 1] : null;
  const nextFlight = currentIndex >= 0 && currentIndex < tailFlights.length - 1 ? tailFlights[currentIndex + 1] : null;

  // Passenger connections linked to this flight (either as from_flight or to_flight)
  const relatedConnections = connections.filter(
    (c) => c.from_flight === flight.flight_id || c.to_flight === flight.flight_id
  );

  // Crew assigned to this aircraft tail
  const assignedCrew = crews.find((c) => c.tail_id === flight.tail_id);

  // Turnaround metrics
  const minTurnaround = 30; // standard 30m min turnaround

  return (
    <div className="bg-[#101827] border border-[#1F2E47] rounded-xl p-6 shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-[#1F2E47] pb-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#35B6F6]/10 border border-[#35B6F6]/30 rounded-lg text-[#35B6F6]">
              <Plane className="w-5 h-5 -rotate-45" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="font-mono text-xl font-bold text-[#E8EEF8]">
                  DISRUPTION DNA: {flight.flight_id}
                </h2>
                <Badge status={flight.status} size="md" />
              </div>
              <p className="text-xs text-[#91A0B8] font-mono mt-0.5">
                Tail: <strong className="text-[#35B6F6]">{flight.tail_id}</strong> • Route: {flight.origin} → {flight.destination} • Pax: {flight.pax}
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-[#91A0B8] hover:text-[#E8EEF8] bg-[#151F30] hover:bg-[#1B293F] border border-[#1F2E47] rounded-lg transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Primary Cause & Causality Chain */}
      <div className="bg-[#151F30] border border-[#1F2E47] p-4 rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-[#91A0B8] uppercase flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#F5B942]" />
            Root Causation Trace
          </span>
          <span className="text-xs font-mono text-[#F05B67] font-semibold">
            Departure Delay: +{flight.dep_delay_minutes}m
          </span>
        </div>
        <CausalChain
          chain={flight.cause_chain?.length ? flight.cause_chain : [flight.cause || 'Nominal']}
          primaryCause={flight.cause}
        />
      </div>

      {/* Schedule vs Actual Telemetry Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
        <div className="bg-[#151F30] border border-[#1F2E47] p-3 rounded-lg">
          <span className="text-[10px] text-[#91A0B8] block uppercase">Scheduled Dep</span>
          <span className="text-[#E8EEF8] text-base font-bold">{flight.scheduled_dep}</span>
        </div>
        <div className="bg-[#151F30] border border-[#1F2E47] p-3 rounded-lg">
          <span className="text-[10px] text-[#91A0B8] block uppercase">Actual Dep</span>
          <span className={flight.dep_delay_minutes > 0 ? 'text-[#F5B942] text-base font-bold' : 'text-[#36D6B0] text-base font-bold'}>
            {flight.actual_dep || '--:--'}
          </span>
        </div>
        <div className="bg-[#151F30] border border-[#1F2E47] p-3 rounded-lg">
          <span className="text-[10px] text-[#91A0B8] block uppercase">Scheduled Arr</span>
          <span className="text-[#E8EEF8] text-base font-bold">{flight.scheduled_arr}</span>
        </div>
        <div className="bg-[#151F30] border border-[#1F2E47] p-3 rounded-lg">
          <span className="text-[10px] text-[#91A0B8] block uppercase">Actual Arr</span>
          <span className={flight.arr_delay_minutes > 0 ? 'text-[#F5B942] text-base font-bold' : 'text-[#36D6B0] text-base font-bold'}>
            {flight.actual_arr || '--:--'}
          </span>
        </div>
      </div>

      {/* Aircraft Rotation Lineage (Predecessor & Successor) */}
      <div className="bg-[#151F30] border border-[#1F2E47] p-4 rounded-lg space-y-3">
        <span className="text-xs font-mono font-bold text-[#91A0B8] uppercase flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#35B6F6]" />
          Aircraft Rotation Chain ({flight.tail_id})
        </span>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
          {/* Predecessor */}
          <div
            onClick={() => previousFlight && onSelectFlight && onSelectFlight(previousFlight.flight_id)}
            className={`p-3 rounded border text-xs font-mono transition ${
              previousFlight
                ? 'bg-[#101827] border-[#1F2E47] hover:border-[#35B6F6] cursor-pointer'
                : 'bg-[#101827]/40 border-dashed border-[#1F2E47] text-[#91A0B8]'
            }`}
          >
            <div className="text-[10px] text-[#91A0B8] uppercase">Leg 1: Predecessor</div>
            {previousFlight ? (
              <div className="mt-1">
                <div className="font-bold text-[#E8EEF8] flex items-center justify-between">
                  <span>{previousFlight.flight_id} ({previousFlight.origin}→{previousFlight.destination})</span>
                  <Badge status={previousFlight.status} size="sm" />
                </div>
                <div className="text-[#91A0B8] mt-0.5">
                  Arr: {previousFlight.actual_arr || previousFlight.scheduled_arr} (+{previousFlight.arr_delay_minutes}m)
                </div>
              </div>
            ) : (
              <div className="mt-1 italic">First leg of the operating day</div>
            )}
          </div>

          {/* Current Flight */}
          <div className="p-3 bg-[#35B6F6]/10 border border-[#35B6F6]/40 rounded text-xs font-mono">
            <div className="text-[10px] text-[#35B6F6] font-bold uppercase">Current Focus Leg</div>
            <div className="mt-1 font-bold text-[#E8EEF8]">
              {flight.flight_id} ({flight.origin} → {flight.destination})
            </div>
            <div className="text-[#F5B942] mt-0.5">
              Turnaround req: {minTurnaround}m
            </div>
          </div>

          {/* Successor */}
          <div
            onClick={() => nextFlight && onSelectFlight && onSelectFlight(nextFlight.flight_id)}
            className={`p-3 rounded border text-xs font-mono transition ${
              nextFlight
                ? 'bg-[#101827] border-[#1F2E47] hover:border-[#35B6F6] cursor-pointer'
                : 'bg-[#101827]/40 border-dashed border-[#1F2E47] text-[#91A0B8]'
            }`}
          >
            <div className="text-[10px] text-[#91A0B8] uppercase">Leg Next: Successor</div>
            {nextFlight ? (
              <div className="mt-1">
                <div className="font-bold text-[#E8EEF8] flex items-center justify-between">
                  <span>{nextFlight.flight_id} ({nextFlight.origin}→{nextFlight.destination})</span>
                  <Badge status={nextFlight.status} size="sm" />
                </div>
                <div className="text-[#91A0B8] mt-0.5">
                  Dep: {nextFlight.actual_dep || nextFlight.scheduled_dep} (+{nextFlight.dep_delay_minutes}m)
                </div>
              </div>
            ) : (
              <div className="mt-1 italic">Final leg of rotation</div>
            )}
          </div>
        </div>
      </div>

      {/* Downstream Impact: Connections & Crew */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Passenger Connections Affected */}
        <div className="bg-[#151F30] border border-[#1F2E47] p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-bold text-[#91A0B8] uppercase flex items-center gap-1.5">
              <Users className="w-4 h-4 text-[#35B6F6]" />
              Passenger Connections ({relatedConnections.length})
            </span>
          </div>
          {relatedConnections.length === 0 ? (
            <p className="text-xs text-[#91A0B8] italic">No onward connection itineraries linked to this flight.</p>
          ) : (
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {relatedConnections.map((conn) => (
                <div
                  key={conn.connection_id}
                  className="p-2 bg-[#101827] border border-[#1F2E47] rounded text-xs font-mono flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-[#E8EEF8]">{conn.connection_id}</span> ({conn.airport})
                    <span className="text-[#91A0B8] block text-[10px]">
                      {conn.from_flight} → {conn.to_flight} ({conn.passengers} pax)
                    </span>
                  </div>
                  <Badge status={conn.status} size="sm" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Crew Duty Status */}
        <div className="bg-[#151F30] border border-[#1F2E47] p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-bold text-[#91A0B8] uppercase flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-[#F5B942]" />
              Assigned Crew Duty
            </span>
            {assignedCrew && <Badge status={assignedCrew.status} size="sm" />}
          </div>
          {assignedCrew ? (
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-[#91A0B8]">Crew ID:</span>
                <span className="font-bold text-[#E8EEF8]">{assignedCrew.crew_id} ({assignedCrew.base} Base)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#91A0B8]">Duty Shift Start:</span>
                <span className="text-[#E8EEF8]">{assignedCrew.duty_start}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#91A0B8]">Duty Utilization:</span>
                <span className={assignedCrew.status === 'VIOLATION' ? 'text-[#F05B67] font-bold' : 'text-[#36D6B0] font-bold'}>
                  {assignedCrew.actual_duty_mins || 0}m / {assignedCrew.max_duty_mins}m ({assignedCrew.remaining_duty_mins}m left)
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#91A0B8] italic">No crew assigned to this tail.</p>
          )}
        </div>
      </div>
    </div>
  );
};
