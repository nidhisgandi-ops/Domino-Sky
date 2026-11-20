import React from 'react';
import { Airport } from '../../types';

interface AirportNodeProps {
  airport: Airport;
  x: number;
  y: number;
  isSelected: boolean;
  isDisrupted: boolean;
  onClick: (airportId: string) => void;
  affectedCount?: number;
}

export const AirportNode: React.FC<AirportNodeProps> = ({
  airport,
  x,
  y,
  isSelected,
  isDisrupted,
  onClick,
  affectedCount,
}) => {
  // Sizing by tier
  let radius = 6; // spoke
  let baseColor = '#91A0B8';

  if (airport.tier === 'mega_hub') {
    radius = 10;
    baseColor = '#35B6F6';
  } else if (airport.tier === 'regional_hub') {
    radius = 8;
    baseColor = '#36D6B0';
  }

  if (isDisrupted) {
    baseColor = '#F05B67';
  }

  return (
    <g
      className="cursor-pointer transition-transform duration-200"
      onClick={() => onClick(airport.id)}
    >
      {/* Outer Pulse Ring for Disrupted Airport */}
      {isDisrupted && (
        <circle
          cx={x}
          cy={y}
          r={radius + 8}
          fill="none"
          stroke="#F05B67"
          strokeWidth="2"
          className="animate-ping origin-center opacity-75"
        />
      )}

      {/* Selected Halo Ring */}
      {isSelected && (
        <circle
          cx={x}
          cy={y}
          r={radius + 5}
          fill="none"
          stroke="#35B6F6"
          strokeWidth="2"
          strokeDasharray="4 2"
          className="animate-spin origin-center"
          style={{ transformOrigin: `${x}px ${y}px` }}
        />
      )}

      {/* Main Node Circle */}
      <circle
        cx={x}
        cy={y}
        r={radius}
        fill={baseColor}
        stroke="#080D18"
        strokeWidth="2"
        className="hover:scale-125 transition-transform"
        style={{ transformOrigin: `${x}px ${y}px` }}
      />

      {/* Center dot for mega hubs */}
      {airport.tier === 'mega_hub' && !isDisrupted && (
        <circle cx={x} cy={y} r="3" fill="#080D18" />
      )}

      {/* Airport IATA Code Text */}
      <text
        x={x}
        y={y - radius - 5}
        textAnchor="middle"
        className="font-mono text-[10px] font-bold fill-[#E8EEF8] pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
      >
        {airport.id}
      </text>

      {/* Affected Flights Badge */}
      {affectedCount !== undefined && affectedCount > 0 && (
        <g transform={`translate(${x + radius - 2}, ${y - radius - 2})`}>
          <circle cx="5" cy="5" r="7" fill="#F05B67" />
          <text
            x="5"
            y="8"
            textAnchor="middle"
            className="font-mono text-[8px] font-bold fill-white pointer-events-none"
          >
            {affectedCount}
          </text>
        </g>
      )}
    </g>
  );
};
