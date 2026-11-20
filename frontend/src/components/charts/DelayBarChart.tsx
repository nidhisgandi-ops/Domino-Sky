import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from 'recharts';
import { FlightResult } from '../../types';

interface DelayBarChartProps {
  flights: FlightResult[];
  maxItems?: number;
  onSelectFlight?: (flightId: string) => void;
}

export const DelayBarChart: React.FC<DelayBarChartProps> = ({
  flights,
  maxItems = 15,
  onSelectFlight,
}) => {
  // Sort by departure delay descending and take top N
  const data = flights
    .filter((f) => f.dep_delay_minutes > 0 || f.status === 'CANCELLED')
    .sort((a, b) => b.dep_delay_minutes - a.dep_delay_minutes)
    .slice(0, maxItems)
    .map((f) => ({
      flight_id: f.flight_id,
      route: `${f.origin}→${f.destination}`,
      delay: f.dep_delay_minutes,
      status: f.status,
      cause: f.cause || 'Turnaround propagation',
      tail_id: f.tail_id,
    }));

  if (data.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-center p-4 text-[#91A0B8] border border-dashed border-[#1F2E47] rounded-lg">
        <span className="text-sm font-medium">No Flight Delays Detected</span>
        <span className="text-xs text-[#91A0B8]/70 mt-1">
          All flights operate on nominal schedule in current state.
        </span>
      </div>
    );
  }

  const getBarColor = (delay: number, status: string) => {
    if (status === 'CANCELLED' || status === 'BLOCKED') return '#F05B67';
    if (delay > 60) return '#F05B67';
    if (delay > 15) return '#F5B942';
    return '#36D6B0';
  };

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#1F2E47" vertical={false} />
          <XAxis
            dataKey="flight_id"
            stroke="#91A0B8"
            tick={{ fill: '#91A0B8', fontSize: 11, fontFamily: 'monospace' }}
            angle={-30}
            textAnchor="end"
            interval={0}
          />
          <YAxis
            stroke="#91A0B8"
            tick={{ fill: '#91A0B8', fontSize: 11, fontFamily: 'monospace' }}
            unit="m"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#101827',
              borderColor: '#1F2E47',
              borderRadius: '8px',
              color: '#E8EEF8',
              fontSize: '12px',
              fontFamily: 'monospace',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            }}
            formatter={(value: any, name: any, item: any) => [
              `${value} mins (${item.payload.status})`,
              'Departure Delay',
            ]}
            labelFormatter={(label, payload) => {
              if (payload && payload[0]) {
                const item = payload[0].payload;
                return `${label} (${item.route}) - Tail: ${item.tail_id}`;
              }
              return label;
            }}
          />
          <Bar
            dataKey="delay"
            radius={[4, 4, 0, 0]}
            onClick={(entry) => onSelectFlight && onSelectFlight(entry.flight_id)}
            cursor="pointer"
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getBarColor(entry.delay, entry.status)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
