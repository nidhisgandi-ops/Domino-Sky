import React, { useMemo, useState } from 'react';
import { useSimulationStore } from '../../stores/simulationStore';
import { AirportNode } from './AirportNode';
import { FlightRoute } from './FlightRoute';
import { NetworkLegend } from './NetworkLegend';
import { FlightResult, Airport } from '../../types';
import { X, Plane, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Badge } from '../ui/Badge';

interface AirportNetworkProps {
  onSelectFlight?: (flightId: string) => void;
  showInspector?: boolean;
}

export const AirportNetwork: React.FC<AirportNetworkProps> = ({
  onSelectFlight,
  showInspector = true,
}) => {
  const {
    airports,
    flights,
    currentSimulation,
    baseline,
    selectedAirport,
    setSelectedAirport,
    selectedFlight,
    setSelectedFlight,
  } = useSimulationStore();

  const [routeFilter, setRouteFilter] = useState<'all' | 'delayed' | 'cancelled'>('all');

  // SVG dimensions
  const svgWidth = 840;
  const svgHeight = 720;
  const padding = 55;

  // Linear projection: India lat [8, 37], lng [68, 98]
  const project = (lat: number, lng: number) => {
    const minLat = 7.5;
    const maxLat = 36.5;
    const minLng = 67.5;
    const maxLng = 97.5;

    const innerW = svgWidth - padding * 2;
    const innerH = svgHeight - padding * 2;

    const x = padding + ((lng - minLng) / (maxLng - minLng)) * innerW;
    const y = padding + ((maxLat - lat) / (maxLat - minLat)) * innerH;

    return { x, y };
  };

  // Map airports by ID for quick coordinate lookups
  const airportMap = useMemo(() => {
    const map = new Map<string, { airport: Airport; x: number; y: number }>();
    airports.forEach((apt) => {
      const { x, y } = project(apt.lat, apt.lng);
      map.set(apt.id, { airport: apt, x, y });
    });
    return map;
  }, [airports]);

  // Flights to render (either from current simulation or baseline or static flights)
  const simulationFlights = useMemo(() => {
    if (currentSimulation?.all_flights) return currentSimulation.all_flights;
    if (baseline?.flights) return baseline.flights;
    return flights.map((f) => ({
      ...f,
      scheduled_dep: f.dep,
      scheduled_arr: f.arr,
      actual_dep: f.dep,
      actual_arr: f.arr,
      dep_delay_minutes: 0,
      arr_delay_minutes: 0,
      status: 'ON_TIME' as const,
      cause: null,
      cause_chain: [],
    }));
  }, [currentSimulation, baseline, flights]);

  // Compute affected flights count per airport
  const affectedCounts = useMemo(() => {
    const counts = new Map<string, number>();
    if (!currentSimulation) return counts;

    currentSimulation.affected_flights.forEach((f) => {
      if (f.dep_delay_minutes > 0 || f.status === 'CANCELLED') {
        counts.set(f.origin, (counts.get(f.origin) || 0) + 1);
        counts.set(f.destination, (counts.get(f.destination) || 0) + 1);
      }
    });
    return counts;
  }, [currentSimulation]);

  // Filtered flights for route drawing
  const displayRoutes = useMemo(() => {
    return simulationFlights.filter((flight) => {
      if (routeFilter === 'delayed') {
        return flight.dep_delay_minutes > 0 || flight.arr_delay_minutes > 0;
      }
      if (routeFilter === 'cancelled') {
        return flight.status === 'CANCELLED' || flight.status === 'BLOCKED';
      }
      return true;
    });
  }, [simulationFlights, routeFilter]);

  // Selected airport object
  const activeAirportData = selectedAirport ? airportMap.get(selectedAirport)?.airport : null;
  const activeAirportFlights = useMemo(() => {
    if (!selectedAirport) return [];
    return simulationFlights.filter(
      (f) => f.origin === selectedAirport || f.destination === selectedAirport
    );
  }, [selectedAirport, simulationFlights]);

  const handleFlightClick = (flightId: string) => {
    setSelectedFlight(flightId);
    if (onSelectFlight) onSelectFlight(flightId);
  };

  // Simplified India geographical polygon points (approx lat/lng scaled)
  const indiaOutlineCoords: [number, number][] = [
    [35.5, 74.8], [35.8, 77.5], [32.5, 79.0], [30.5, 81.0], [27.5, 88.0],
    [28.0, 88.5], [27.5, 92.0], [28.2, 96.5], [26.5, 97.0], [24.0, 93.5],
    [23.5, 92.0], [22.0, 88.5], [19.5, 85.5], [15.5, 80.5], [13.0, 80.0],
    [10.0, 79.8], [8.2, 77.5], [10.0, 76.5], [15.0, 74.0], [19.0, 72.8],
    [21.0, 72.5], [21.0, 70.0], [23.0, 69.0], [24.5, 70.5], [27.0, 71.0],
    [31.0, 74.0], [33.5, 74.5],
  ];

  const indiaPolygonPoints = indiaOutlineCoords
    .map(([lat, lng]) => {
      const pt = project(lat, lng);
      return `${pt.x},${pt.y}`;
    })
    .join(' ');

  return (
    <div className="relative w-full h-[620px] bg-[#080D18] border border-[#1F2E47] rounded-lg overflow-hidden flex flex-col">
      {/* Top Controls Overlay */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-[#101827]/90 backdrop-blur-md p-1.5 rounded-lg border border-[#1F2E47]">
        <span className="text-[10px] font-mono font-bold text-[#91A0B8] uppercase px-2">
          Route Filter:
        </span>
        <button
          onClick={() => setRouteFilter('all')}
          className={`px-2.5 py-1 text-xs rounded font-medium transition ${
            routeFilter === 'all'
              ? 'bg-[#35B6F6] text-[#080D18] font-bold'
              : 'text-[#91A0B8] hover:text-[#E8EEF8]'
          }`}
        >
          All ({simulationFlights.length})
        </button>
        <button
          onClick={() => setRouteFilter('delayed')}
          className={`px-2.5 py-1 text-xs rounded font-medium transition ${
            routeFilter === 'delayed'
              ? 'bg-[#F5B942] text-[#080D18] font-bold'
              : 'text-[#91A0B8] hover:text-[#E8EEF8]'
          }`}
        >
          Delayed
        </button>
        <button
          onClick={() => setRouteFilter('cancelled')}
          className={`px-2.5 py-1 text-xs rounded font-medium transition ${
            routeFilter === 'cancelled'
              ? 'bg-[#F05B67] text-white font-bold'
              : 'text-[#91A0B8] hover:text-[#E8EEF8]'
          }`}
        >
          Cancelled
        </button>
      </div>

      {/* Network Legend Overlay */}
      <div className="absolute bottom-3 left-3 z-20 max-w-xs">
        <NetworkLegend />
      </div>

      {/* Main SVG Canvas */}
      <div className="flex-1 w-full h-full relative flex items-center justify-center">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-full max-h-[600px] select-none"
          role="img"
          aria-label="Interactive airspace map of 16 airports across India"
        >
          <defs>
            {/* Arrowhead Markers */}
            <marker
              id="arrow-normal"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="4"
              markerHeight="4"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#35B6F6" fillOpacity="0.4" />
            </marker>
            <marker
              id="arrow-ontime"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#36D6B0" />
            </marker>
            <marker
              id="arrow-delayed"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#F5B942" />
            </marker>
            <marker
              id="arrow-cancelled"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#F05B67" />
            </marker>
          </defs>

          {/* India Geographical Boundary Outline */}
          <polygon
            points={indiaPolygonPoints}
            fill="#101827"
            stroke="#1F2E47"
            strokeWidth="1.5"
            strokeDasharray="4 2"
            opacity="0.75"
          />

          {/* Radar background circles for aesthetic */}
          <circle cx={svgWidth * 0.45} cy={svgHeight * 0.55} r="180" fill="none" stroke="#1F2E47" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.3" />
          <circle cx={svgWidth * 0.45} cy={svgHeight * 0.55} r="320" fill="none" stroke="#1F2E47" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.2" />

          {/* Flight Routes */}
          <g id="flight-routes">
            {displayRoutes.map((flight) => {
              const orig = airportMap.get(flight.origin);
              const dest = airportMap.get(flight.destination);
              if (!orig || !dest) return null;

              const isSelected = selectedFlight === flight.flight_id;
              const isAirportRelated =
                selectedAirport === flight.origin || selectedAirport === flight.destination;

              let routeStatus: 'ON_TIME' | 'DELAYED' | 'CANCELLED' | 'BLOCKED' | 'NORMAL' =
                'NORMAL';
              if (flight.status === 'CANCELLED' || flight.status === 'BLOCKED') {
                routeStatus = flight.status;
              } else if (flight.dep_delay_minutes > 0 || flight.arr_delay_minutes > 0) {
                routeStatus = 'DELAYED';
              } else if (currentSimulation) {
                routeStatus = 'ON_TIME';
              }

              return (
                <FlightRoute
                  key={flight.flight_id}
                  id={flight.flight_id}
                  x1={orig.x}
                  y1={orig.y}
                  x2={dest.x}
                  y2={dest.y}
                  status={routeStatus}
                  isSelected={isSelected}
                  isHighlighted={isAirportRelated}
                  flightId={flight.flight_id}
                  onClick={() => handleFlightClick(flight.flight_id)}
                />
              );
            })}
          </g>

          {/* Airport Nodes */}
          <g id="airport-nodes">
            {airports.map((airport) => {
              const coords = airportMap.get(airport.id);
              if (!coords) return null;

              const isSelected = selectedAirport === airport.id;
              const isDisrupted = currentSimulation?.airport_id === airport.id;
              const affectedCount = affectedCounts.get(airport.id);

              return (
                <AirportNode
                  key={airport.id}
                  airport={airport}
                  x={coords.x}
                  y={coords.y}
                  isSelected={isSelected}
                  isDisrupted={isDisrupted}
                  affectedCount={affectedCount}
                  onClick={(id) => setSelectedAirport(selectedAirport === id ? null : id)}
                />
              );
            })}
          </g>
        </svg>
      </div>

      {/* Airport Inspector Sidebar */}
      {showInspector && activeAirportData && (
        <div className="absolute top-3 right-3 bottom-3 w-80 bg-[#101827]/95 backdrop-blur-md border border-[#1F2E47] rounded-lg p-4 z-30 flex flex-col shadow-2xl">
          <div className="flex items-start justify-between pb-3 border-b border-[#1F2E47]">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xl font-bold text-[#E8EEF8]">
                  {activeAirportData.id}
                </span>
                <Badge status={activeAirportData.tier} />
              </div>
              <p className="text-xs text-[#91A0B8] mt-0.5">{activeAirportData.name}</p>
              <p className="text-xs text-[#35B6F6] font-medium">{activeAirportData.city}</p>
            </div>
            <button
              onClick={() => setSelectedAirport(null)}
              className="p-1 text-[#91A0B8] hover:text-white rounded hover:bg-[#151F30]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="py-2.5 grid grid-cols-2 gap-2 text-xs font-mono border-b border-[#1F2E47]">
            <div className="bg-[#151F30] p-2 rounded">
              <span className="text-[#91A0B8] block text-[10px]">CAPACITY / HR</span>
              <span className="text-[#E8EEF8] font-bold">
                {activeAirportData.capacity_per_hour} mvts
              </span>
            </div>
            <div className="bg-[#151F30] p-2 rounded">
              <span className="text-[#91A0B8] block text-[10px]">TOTAL FLIGHTS</span>
              <span className="text-[#35B6F6] font-bold">
                {activeAirportFlights.length}
              </span>
            </div>
          </div>

          {currentSimulation?.airport_id === activeAirportData.id && (
            <div className="my-2 p-2 bg-[#F05B67]/20 border border-[#F05B67]/40 rounded text-xs text-[#F05B67] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                GROUND STOP: {currentSimulation.closure_start} ({currentSimulation.closure_duration_minutes}m)
              </span>
            </div>
          )}

          {/* Flights list through this airport */}
          <div className="mt-2 flex-1 overflow-y-auto space-y-1.5 pr-1">
            <div className="text-[10px] font-mono text-[#91A0B8] uppercase tracking-wider mb-1">
              Active Flights ({activeAirportFlights.length})
            </div>
            {activeAirportFlights.map((flight) => (
              <div
                key={flight.flight_id}
                onClick={() => handleFlightClick(flight.flight_id)}
                className={`p-2 rounded border text-xs cursor-pointer transition ${
                  selectedFlight === flight.flight_id
                    ? 'bg-[#151F30] border-[#35B6F6]'
                    : 'bg-[#151F30]/50 border-[#1F2E47] hover:border-[#2D3F5E]'
                }`}
              >
                <div className="flex items-center justify-between font-mono">
                  <span className="font-bold text-[#E8EEF8] flex items-center gap-1">
                    <Plane className="w-3 h-3 text-[#35B6F6]" />
                    {flight.flight_id}
                  </span>
                  <Badge status={flight.status} size="sm" />
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-[#91A0B8]">
                  <span>
                    {flight.origin} → {flight.destination}
                  </span>
                  <span className="font-mono">
                    {flight.scheduled_dep} - {flight.scheduled_arr}
                  </span>
                </div>
                {flight.dep_delay_minutes > 0 && (
                  <div className="mt-1 text-[10px] text-[#F5B942] font-mono">
                    Delay: +{flight.dep_delay_minutes}m ({flight.cause || 'Cascaded'})
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
