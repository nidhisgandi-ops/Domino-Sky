import React from 'react';

interface FlightRouteProps {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  status: 'ON_TIME' | 'DELAYED' | 'CANCELLED' | 'BLOCKED' | 'NORMAL';
  isSelected?: boolean;
  isHighlighted?: boolean;
  flightId?: string;
  onClick?: () => void;
}

export const FlightRoute: React.FC<FlightRouteProps> = ({
  id,
  x1,
  y1,
  x2,
  y2,
  status,
  isSelected = false,
  isHighlighted = false,
  flightId,
  onClick,
}) => {
  // Compute quadratic Bézier curve control point
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Normal vector to the line
  const nx = -dy / (dist || 1);
  const ny = dx / (dist || 1);

  // Dynamic arc curvature
  const curvature = Math.min(45, Math.max(15, dist * 0.18));
  const cx = (x1 + x2) / 2 + nx * curvature;
  const cy = (y1 + y2) / 2 + ny * curvature;

  const path = `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;

  let strokeColor = '#35B6F6';
  let strokeOpacity = 0.25;
  let strokeWidth = 1.5;
  let markerEnd = 'url(#arrow-normal)';

  switch (status) {
    case 'ON_TIME':
      strokeColor = '#36D6B0';
      strokeOpacity = 0.6;
      strokeWidth = 2;
      markerEnd = 'url(#arrow-ontime)';
      break;
    case 'DELAYED':
      strokeColor = '#F5B942';
      strokeOpacity = 0.85;
      strokeWidth = 2.5;
      markerEnd = 'url(#arrow-delayed)';
      break;
    case 'CANCELLED':
    case 'BLOCKED':
      strokeColor = '#F05B67';
      strokeOpacity = 0.9;
      strokeWidth = 2.5;
      markerEnd = 'url(#arrow-cancelled)';
      break;
    default:
      strokeColor = '#35B6F6';
      strokeOpacity = 0.25;
      strokeWidth = 1.5;
      markerEnd = 'url(#arrow-normal)';
      break;
  }

  if (isSelected || isHighlighted) {
    strokeOpacity = 1;
    strokeWidth = 3.5;
  }

  return (
    <g className="cursor-pointer group" onClick={onClick}>
      {/* Invisible wider hit area for easy hover/clicking */}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth="14"
        className="cursor-pointer"
      />

      {/* Glow path for selected/delayed */}
      {(isSelected || status === 'DELAYED' || status === 'CANCELLED') && (
        <path
          d={path}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth + 3}
          strokeOpacity={0.25}
        />
      )}

      {/* Main route arc */}
      <path
        id={`path-${id}`}
        d={path}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeOpacity={strokeOpacity}
        markerEnd={markerEnd}
        strokeDasharray={isSelected ? '6 4' : status === 'CANCELLED' ? '4 4' : undefined}
        className={isSelected ? 'animate-pulse' : undefined}
      />
    </g>
  );
};
