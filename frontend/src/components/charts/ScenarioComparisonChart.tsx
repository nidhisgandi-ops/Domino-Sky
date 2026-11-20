import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from 'recharts';
import { Scenario } from '../../types';

interface ScenarioComparisonChartProps {
  scenarios: Scenario[];
}

export const ScenarioComparisonChart: React.FC<ScenarioComparisonChartProps> = ({
  scenarios,
}) => {
  const data = scenarios
    .filter((s) => s.metrics || s.result?.metrics)
    .map((s) => {
      const m = s.metrics || s.result?.metrics!;
      return {
        name: s.scenario_name || `${s.airport_id} (${s.closure_duration_minutes}m)`,
        delayed_flights: m.delayed_flights,
        missed_connections: m.missed_connections,
        crew_alerts: m.crew_violations + m.crew_warnings,
        delay_hours: Math.round((m.total_delay_minutes / 60) * 10) / 10,
      };
    });

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-[#91A0B8] border border-dashed border-[#1F2E47] rounded-lg">
        Select 2 or more executed scenarios to view side-by-side comparison.
      </div>
    );
  }

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 20, left: -10, bottom: 35 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#1F2E47" vertical={false} />
          <XAxis
            dataKey="name"
            stroke="#91A0B8"
            tick={{ fill: '#91A0B8', fontSize: 11, fontFamily: 'monospace' }}
            interval={0}
            angle={-15}
            textAnchor="end"
          />
          <YAxis stroke="#91A0B8" tick={{ fill: '#91A0B8', fontSize: 11, fontFamily: 'monospace' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#101827',
              borderColor: '#1F2E47',
              borderRadius: '8px',
              color: '#E8EEF8',
              fontSize: '12px',
              fontFamily: 'monospace',
            }}
          />
          <Legend
            verticalAlign="top"
            height={36}
            formatter={(value) => (
              <span className="text-xs font-mono text-[#E8EEF8] capitalize">
                {value.replace('_', ' ')}
              </span>
            )}
          />
          <Bar dataKey="delayed_flights" fill="#F5B942" name="Delayed Flights" radius={[4, 4, 0, 0]} />
          <Bar dataKey="missed_connections" fill="#F05B67" name="Missed Connections" radius={[4, 4, 0, 0]} />
          <Bar dataKey="delay_hours" fill="#35B6F6" name="Total Delay (Hours)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
