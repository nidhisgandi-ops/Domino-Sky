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
  ReferenceLine,
} from 'recharts';
import { CrewStatus } from '../../types';

interface CrewDutyChartProps {
  crews: CrewStatus[];
}

export const CrewDutyChart: React.FC<CrewDutyChartProps> = ({ crews }) => {
  const data = crews.map((c) => {
    const actual = c.actual_duty_mins || 0;
    const maxDuty = c.max_duty_mins || 600;
    const remaining = c.remaining_duty_mins !== null ? c.remaining_duty_mins : maxDuty - actual;
    const utilPct = Math.min(100, Math.round((actual / maxDuty) * 100));

    return {
      crew_id: c.crew_id,
      tail_id: c.tail_id,
      base: c.base,
      actual_duty_mins: actual,
      max_duty_mins: maxDuty,
      remaining_duty_mins: remaining,
      utilPct,
      status: c.status,
    };
  });

  const getBarColor = (status: string, remaining: number) => {
    if (status === 'VIOLATION' || remaining <= 0) return '#F05B67';
    if (status === 'WARNING' || remaining <= 60) return '#F5B942';
    return '#36D6B0';
  };

  if (crews.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-[#91A0B8] border border-dashed border-[#1F2E47] rounded-lg">
        No crew operational duty records found
      </div>
    );
  }

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 15, right: 15, left: -20, bottom: 25 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#1F2E47" vertical={false} />
          <XAxis
            dataKey="crew_id"
            stroke="#91A0B8"
            tick={{ fill: '#91A0B8', fontSize: 10, fontFamily: 'monospace' }}
            angle={-30}
            textAnchor="end"
            interval={0}
          />
          <YAxis
            stroke="#91A0B8"
            tick={{ fill: '#91A0B8', fontSize: 10, fontFamily: 'monospace' }}
            domain={[0, 650]}
            unit="m"
          />
          {/* Regulatory limit line: 600m (10 hrs) */}
          <ReferenceLine
            y={600}
            stroke="#F05B67"
            strokeDasharray="4 4"
            label={{
              value: 'Max Duty (600m)',
              fill: '#F05B67',
              fontSize: 10,
              position: 'top',
              fontFamily: 'monospace',
            }}
          />
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
              `${value} mins (${item.payload.utilPct}% used, ${item.payload.remaining_duty_mins}m remaining)`,
              'Actual Duty',
            ]}
            labelFormatter={(label, payload) => {
              if (payload && payload[0]) {
                const item = payload[0].payload;
                return `${label} (${item.base}) - Assigned Tail: ${item.tail_id} [${item.status}]`;
              }
              return label;
            }}
          />
          <Bar dataKey="actual_duty_mins" radius={[3, 3, 0, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getBarColor(entry.status, entry.remaining_duty_mins)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
