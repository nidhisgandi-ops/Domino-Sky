import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { ConnectionResult } from '../../types';

interface ConnectionStatusChartProps {
  connections: ConnectionResult[];
}

export const ConnectionStatusChart: React.FC<ConnectionStatusChartProps> = ({
  connections,
}) => {
  // Aggregate status count and passenger count
  const statusCounts = connections.reduce(
    (acc, conn) => {
      const status = conn.status || 'FEASIBLE';
      if (!acc[status]) {
        acc[status] = { count: 0, passengers: 0 };
      }
      acc[status].count += 1;
      acc[status].passengers += conn.passengers;
      return acc;
    },
    {} as Record<string, { count: number; passengers: number }>
  );

  const colors: Record<string, string> = {
    FEASIBLE: '#36D6B0',
    AT_RISK: '#F5B942',
    MISSED: '#F05B67',
    DISRUPTED: '#F05B67',
  };

  const data = Object.entries(statusCounts).map(([status, vals]) => ({
    name: status,
    value: vals.count,
    passengers: vals.passengers,
    color: colors[status] || '#91A0B8',
  }));

  if (connections.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-[#91A0B8] border border-dashed border-[#1F2E47] rounded-lg">
        No connection data available
      </div>
    );
  }

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="45%"
            innerRadius={60}
            outerRadius={85}
            paddingAngle={4}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} stroke="#101827" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#101827',
              borderColor: '#1F2E47',
              borderRadius: '8px',
              color: '#E8EEF8',
              fontSize: '12px',
              fontFamily: 'monospace',
            }}
            formatter={(value: any, name: any, item: any) => [
              `${value} connections (${item.payload.passengers} passengers)`,
              name,
            ]}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value) => (
              <span className="text-xs font-mono text-[#E8EEF8] uppercase">
                {value}
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
