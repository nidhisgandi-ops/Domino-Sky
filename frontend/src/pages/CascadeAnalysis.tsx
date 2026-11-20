import React, { useState, useMemo } from 'react';
import { useSimulationStore } from '../stores/simulationStore';
import { DisruptionDNA } from '../components/disruption/DisruptionDNA';
import { AircraftRotationTimeline } from '../components/charts/AircraftRotationTimeline';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { MetricCard } from '../components/ui/MetricCard';
import { FlightResult } from '../types';
import {
  GitFork,
  Filter,
  Search,
  Dna,
  Clock,
  Plane,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';

export const CascadeAnalysis: React.FC = () => {
  const {
    currentSimulation,
    baseline,
    airports,
    selectedFlight,
    setSelectedFlight,
  } = useSimulationStore();

  const [selectedTail, setSelectedTail] = useState<string>('all');
  const [selectedAirportFilter, setSelectedAirportFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'delayed' | 'critical' | 'cancelled'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeDnaFlight, setActiveDnaFlight] = useState<FlightResult | null>(null);

  const activeFlights = currentSimulation?.all_flights || baseline?.flights || [];
  const activeConnections = currentSimulation?.all_connections || baseline?.connections || [];
  const activeCrews = currentSimulation?.crew_status || baseline?.crew_status || [];

  // Unique tail IDs
  const allTails = useMemo(() => {
    return Array.from(new Set(activeFlights.map((f) => f.tail_id))).sort();
  }, [activeFlights]);

  // Filtered flights
  const filteredFlights = useMemo(() => {
    return activeFlights.filter((flight) => {
      // Tail filter
      if (selectedTail !== 'all' && flight.tail_id !== selectedTail) return false;

      // Airport filter
      if (
        selectedAirportFilter !== 'all' &&
        flight.origin !== selectedAirportFilter &&
        flight.destination !== selectedAirportFilter
      ) {
        return false;
      }

      // Severity filter
      if (severityFilter === 'delayed' && flight.dep_delay_minutes === 0) return false;
      if (severityFilter === 'critical' && flight.dep_delay_minutes < 60) return false;
      if (severityFilter === 'cancelled' && flight.status !== 'CANCELLED' && flight.status !== 'BLOCKED') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          flight.flight_id.toLowerCase().includes(q) ||
          flight.origin.toLowerCase().includes(q) ||
          flight.destination.toLowerCase().includes(q) ||
          flight.tail_id.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [activeFlights, selectedTail, selectedAirportFilter, severityFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-[#101827] border border-[#1F2E47] p-4 rounded-lg">
        <div>
          <h1 className="text-xl font-mono font-bold text-[#E8EEF8] flex items-center gap-2">
            <GitFork className="w-5 h-5 text-[#35B6F6]" />
            Cascade Analysis & Root Cause Trace
          </h1>
          <p className="text-xs text-[#91A0B8] mt-0.5 font-mono">
            Downstream propagation across aircraft rotations and turnaround dependencies.
          </p>
        </div>

        {currentSimulation && (
          <div className="px-3 py-1.5 bg-[#F05B67]/15 border border-[#F05B67]/30 rounded-lg text-xs font-mono text-[#F05B67] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              Root Hub: <strong>{currentSimulation.airport_id}</strong> (+{currentSimulation.metrics.total_delay_minutes}m total delay)
            </span>
          </div>
        )}
      </div>

      {/* Aircraft Rotation Gantt Timeline */}
      <Card
        title="Aircraft Rotation Chain Timeline"
        subtitle="Chronological rotation of each aircraft tail throughout the operating day"
      >
        <AircraftRotationTimeline
          flights={activeFlights}
          selectedTailId={selectedTail !== 'all' ? selectedTail : null}
          onSelectFlight={(flightId) => {
            setSelectedFlight(flightId);
            const found = activeFlights.find((f) => f.flight_id === flightId);
            if (found) setActiveDnaFlight(found);
          }}
          onSelectTail={(tailId) => setSelectedTail(tailId)}
        />
      </Card>

      {/* Multi-Filter Bar */}
      <div className="bg-[#101827] border border-[#1F2E47] p-4 rounded-lg grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#91A0B8]" />
          <input
            type="text"
            placeholder="Search flight or tail..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-[#151F30] border border-[#1F2E47] rounded-lg text-xs font-mono text-[#E8EEF8] focus:outline-none focus:border-[#35B6F6]"
          />
        </div>

        {/* Filter by Aircraft Tail */}
        <div>
          <select
            value={selectedTail}
            onChange={(e) => setSelectedTail(e.target.value)}
            className="w-full px-3 py-1.5 bg-[#151F30] border border-[#1F2E47] rounded-lg text-xs font-mono text-[#E8EEF8] focus:outline-none focus:border-[#35B6F6]"
          >
            <option value="all">All Aircraft Tails ({allTails.length})</option>
            {allTails.map((tail) => (
              <option key={tail} value={tail}>
                Tail: {tail}
              </option>
            ))}
          </select>
        </div>

        {/* Filter by Airport */}
        <div>
          <select
            value={selectedAirportFilter}
            onChange={(e) => setSelectedAirportFilter(e.target.value)}
            className="w-full px-3 py-1.5 bg-[#151F30] border border-[#1F2E47] rounded-lg text-xs font-mono text-[#E8EEF8] focus:outline-none focus:border-[#35B6F6]"
          >
            <option value="all">All Airport Hubs</option>
            {airports.map((apt) => (
              <option key={apt.id} value={apt.id}>
                Hub: {apt.id} ({apt.city})
              </option>
            ))}
          </select>
        </div>

        {/* Severity Filter */}
        <div className="flex items-center gap-1 bg-[#151F30] border border-[#1F2E47] p-1 rounded-lg">
          <button
            onClick={() => setSeverityFilter('all')}
            className={`flex-1 py-1 text-[11px] font-mono rounded ${
              severityFilter === 'all' ? 'bg-[#35B6F6] text-[#080D18] font-bold' : 'text-[#91A0B8]'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setSeverityFilter('delayed')}
            className={`flex-1 py-1 text-[11px] font-mono rounded ${
              severityFilter === 'delayed' ? 'bg-[#F5B942] text-[#080D18] font-bold' : 'text-[#91A0B8]'
            }`}
          >
            Delayed
          </button>
          <button
            onClick={() => setSeverityFilter('critical')}
            className={`flex-1 py-1 text-[11px] font-mono rounded ${
              severityFilter === 'critical' ? 'bg-[#F05B67] text-white font-bold' : 'text-[#91A0B8]'
            }`}
          >
            &gt;60m
          </button>
          <button
            onClick={() => setSeverityFilter('cancelled')}
            className={`flex-1 py-1 text-[11px] font-mono rounded ${
              severityFilter === 'cancelled' ? 'bg-[#F05B67] text-white font-bold' : 'text-[#91A0B8]'
            }`}
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Flight Cascade Table */}
      <Card
        title={`Affected Flight Rotation Legs (${filteredFlights.length})`}
        subtitle="Detailed schedule propagation, turnaround slack, and root causes"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-[#1F2E47] text-[#91A0B8] uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Flight ID</th>
                <th className="py-2.5 px-3">Tail</th>
                <th className="py-2.5 px-3">Route</th>
                <th className="py-2.5 px-3">Scheduled</th>
                <th className="py-2.5 px-3">Actual (Dep/Arr)</th>
                <th className="py-2.5 px-3">Delay</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Primary Root Cause</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2E47]/50">
              {filteredFlights.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-[#91A0B8]">
                    No flights matching the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredFlights.map((flight) => {
                  const isDelay = flight.dep_delay_minutes > 0;
                  const isCritical = flight.dep_delay_minutes >= 60;

                  return (
                    <tr
                      key={flight.flight_id}
                      className="hover:bg-[#1B293F]/50 transition group"
                    >
                      <td className="py-2.5 px-3 font-bold text-[#E8EEF8]">
                        <span className="flex items-center gap-1.5">
                          <Plane className="w-3.5 h-3.5 text-[#35B6F6]" />
                          {flight.flight_id}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[#35B6F6] font-semibold">
                        {flight.tail_id}
                      </td>
                      <td className="py-2.5 px-3 text-[#E8EEF8]">
                        {flight.origin} → {flight.destination}
                      </td>
                      <td className="py-2.5 px-3 text-[#91A0B8]">
                        {flight.scheduled_dep} - {flight.scheduled_arr}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={
                            isDelay ? 'text-[#F5B942] font-semibold' : 'text-[#36D6B0]'
                          }
                        >
                          {flight.actual_dep || flight.scheduled_dep} - {flight.actual_arr || flight.scheduled_arr}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {isDelay ? (
                          <span
                            className={
                              isCritical ? 'text-[#F05B67] font-bold' : 'text-[#F5B942] font-semibold'
                            }
                          >
                            +{flight.dep_delay_minutes}m
                          </span>
                        ) : (
                          <span className="text-[#36D6B0]">0m</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge status={flight.status} size="sm" />
                      </td>
                      <td className="py-2.5 px-3 text-[#91A0B8] max-w-xs truncate">
                        {flight.cause || 'Nominal schedule'}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedFlight(flight.flight_id);
                            setActiveDnaFlight(flight);
                          }}
                          className="px-2.5 py-1 bg-[#35B6F6]/10 hover:bg-[#35B6F6]/20 border border-[#35B6F6]/40 text-[#35B6F6] rounded text-[11px] font-semibold transition inline-flex items-center gap-1"
                        >
                          <Dna className="w-3 h-3" />
                          <span>View DNA</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Disruption DNA Modal */}
      {activeDnaFlight && (
        <div className="fixed inset-0 bg-[#080D18]/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto my-auto">
            <DisruptionDNA
              flight={activeDnaFlight}
              allFlights={activeFlights}
              connections={activeConnections}
              crews={activeCrews}
              onClose={() => setActiveDnaFlight(null)}
              onSelectFlight={(newFlightId) => {
                const found = activeFlights.find((f) => f.flight_id === newFlightId);
                if (found) setActiveDnaFlight(found);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
