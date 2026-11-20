import React, { useState } from 'react';
import { useSimulationStore } from '../stores/simulationStore';
import { AirportNetwork } from '../components/network/AirportNetwork';
import { DisruptionDNA } from '../components/disruption/DisruptionDNA';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Plane, Search, Filter, Dna, ArrowRight } from 'lucide-react';

export const LiveNetwork: React.FC = () => {
  const {
    airports,
    currentSimulation,
    baseline,
    selectedAirport,
    setSelectedAirport,
    selectedFlight,
    setSelectedFlight,
  } = useSimulationStore();

  const [isDNAModalOpen, setIsDNAModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const activeFlights = currentSimulation?.all_flights || baseline?.flights || [];
  const activeConnections = currentSimulation?.all_connections || baseline?.connections || [];
  const activeCrews = currentSimulation?.crew_status || baseline?.crew_status || [];

  const inspectedFlightObj = activeFlights.find((f) => f.flight_id === selectedFlight);

  const filteredAirports = airports.filter(
    (a) =>
      a.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header & Quick Airport Selector */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-[#101827] border border-[#1F2E47] p-4 rounded-lg">
        <div>
          <h1 className="text-xl font-mono font-bold text-[#E8EEF8] flex items-center gap-2">
            <Plane className="w-5 h-5 text-[#35B6F6] -rotate-45" />
            Live Airspace & Route Network
          </h1>
          <p className="text-xs text-[#91A0B8] mt-0.5 font-mono">
            Full-mesh flight topology across 16 Indian airports. Click any node or flight arc to inspect.
          </p>
        </div>

        {/* Airport Search & Selection */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#91A0B8]" />
            <input
              type="text"
              placeholder="Search airport (e.g. BOM, DEL)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-[#151F30] border border-[#1F2E47] rounded-lg text-xs font-mono text-[#E8EEF8] placeholder-[#91A0B8]/60 focus:outline-none focus:border-[#35B6F6]"
            />
          </div>
          {selectedAirport && (
            <button
              onClick={() => setSelectedAirport(null)}
              className="px-2.5 py-1.5 bg-[#151F30] hover:bg-[#1B293F] border border-[#1F2E47] text-xs font-mono text-[#91A0B8] rounded-lg"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Network Map Viewport */}
      <AirportNetwork
        onSelectFlight={(flightId) => {
          setSelectedFlight(flightId);
        }}
      />

      {/* Selected Flight Quick Drawer / Action Bar */}
      {inspectedFlightObj && (
        <div className="bg-[#151F30] border border-[#35B6F6]/40 p-4 rounded-lg shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-[#35B6F6]/10 border border-[#35B6F6]/30 rounded-lg text-[#35B6F6]">
              <Plane className="w-5 h-5 -rotate-45" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-bold text-[#E8EEF8]">
                  Flight {inspectedFlightObj.flight_id}
                </span>
                <Badge status={inspectedFlightObj.status} size="sm" />
                <span className="text-xs font-mono text-[#35B6F6]">
                  Tail: {inspectedFlightObj.tail_id}
                </span>
              </div>
              <p className="text-xs text-[#91A0B8] font-mono mt-0.5">
                Route: {inspectedFlightObj.origin} → {inspectedFlightObj.destination} • Scheduled:{' '}
                {inspectedFlightObj.scheduled_dep} - {inspectedFlightObj.scheduled_arr} • Delay:{' '}
                <strong className={inspectedFlightObj.dep_delay_minutes > 0 ? 'text-[#F5B942]' : 'text-[#36D6B0]'}>
                  +{inspectedFlightObj.dep_delay_minutes}m
                </strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch md:self-auto">
            <button
              onClick={() => setIsDNAModalOpen(true)}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-[#35B6F6] hover:bg-[#35B6F6]/90 text-[#080D18] rounded-lg text-xs font-mono font-bold uppercase transition"
            >
              <Dna className="w-4 h-4" />
              <span>Inspect Disruption DNA</span>
            </button>
            <button
              onClick={() => setSelectedFlight(null)}
              className="px-3 py-2 bg-[#101827] hover:bg-[#1B293F] border border-[#1F2E47] text-xs font-mono text-[#91A0B8] rounded-lg"
            >
              Deselect
            </button>
          </div>
        </div>
      )}

      {/* Disruption DNA Modal */}
      {isDNAModalOpen && inspectedFlightObj && (
        <div className="fixed inset-0 bg-[#080D18]/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto my-auto">
            <DisruptionDNA
              flight={inspectedFlightObj}
              allFlights={activeFlights}
              connections={activeConnections}
              crews={activeCrews}
              onClose={() => setIsDNAModalOpen(false)}
              onSelectFlight={(newFlightId) => setSelectedFlight(newFlightId)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
