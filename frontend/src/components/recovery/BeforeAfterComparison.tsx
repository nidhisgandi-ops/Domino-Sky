import React from 'react';
import { OperationalMetrics } from '../../types';
import { clsx } from 'clsx';
import { ArrowDownRight, ArrowUpRight, CheckCircle2, ShieldAlert } from 'lucide-react';

interface BeforeAfterComparisonProps {
  beforeMetrics: OperationalMetrics;
  afterMetrics: OperationalMetrics;
  actionTitle?: string;
}

export const BeforeAfterComparison: React.FC<BeforeAfterComparisonProps> = ({
  beforeMetrics,
  afterMetrics,
  actionTitle = 'Applied Recovery Strategy',
}) => {
  const delayDelta = afterMetrics.total_delay_minutes - beforeMetrics.total_delay_minutes;
  const delayedFlightsDelta = afterMetrics.delayed_flights - beforeMetrics.delayed_flights;
  const missedConnDelta = afterMetrics.missed_connections - beforeMetrics.missed_connections;
  const cancelledDelta = afterMetrics.cancelled_flights - beforeMetrics.cancelled_flights;
  const crewViolationsDelta = afterMetrics.crew_violations - beforeMetrics.crew_violations;

  const metricsRow = [
    {
      label: 'Delayed Flights',
      before: beforeMetrics.delayed_flights,
      after: afterMetrics.delayed_flights,
      delta: delayedFlightsDelta,
      unit: '',
      isLowerBetter: true,
    },
    {
      label: 'Total Delay Mins',
      before: beforeMetrics.total_delay_minutes,
      after: afterMetrics.total_delay_minutes,
      delta: delayDelta,
      unit: 'm',
      isLowerBetter: true,
    },
    {
      label: 'Cancelled Flights',
      before: beforeMetrics.cancelled_flights,
      after: afterMetrics.cancelled_flights,
      delta: cancelledDelta,
      unit: '',
      isLowerBetter: true,
    },
    {
      label: 'Missed Connections',
      before: beforeMetrics.missed_connections,
      after: afterMetrics.missed_connections,
      delta: missedConnDelta,
      unit: '',
      isLowerBetter: true,
    },
    {
      label: 'Crew Violations',
      before: beforeMetrics.crew_violations,
      after: afterMetrics.crew_violations,
      delta: crewViolationsDelta,
      unit: '',
      isLowerBetter: true,
    },
  ];

  return (
    <div className="bg-[#151F30] border border-[#1F2E47] rounded-lg p-5">
      <div className="flex items-center justify-between pb-4 border-b border-[#1F2E47]">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-[#36D6B0]" />
          <h3 className="text-sm font-mono font-bold text-[#E8EEF8] uppercase">
            Before vs After Recovery Audit
          </h3>
        </div>
        <span className="text-xs font-mono text-[#35B6F6]">{actionTitle}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-4">
        {metricsRow.map((m) => {
          const isImproved = m.isLowerBetter ? m.delta < 0 : m.delta > 0;
          const isWorsened = m.isLowerBetter ? m.delta > 0 : m.delta < 0;

          return (
            <div
              key={m.label}
              className="bg-[#101827] border border-[#1F2E47] p-3 rounded-lg text-xs font-mono"
            >
              <span className="text-[10px] text-[#91A0B8] uppercase block">
                {m.label}
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <div>
                  <span className="text-[#91A0B8] line-through mr-1.5 text-xs">
                    {m.before}
                    {m.unit}
                  </span>
                  <span className="text-[#E8EEF8] font-bold text-base">
                    {m.after}
                    {m.unit}
                  </span>
                </div>
                {m.delta !== 0 && (
                  <span
                    className={clsx(
                      'text-[11px] font-bold flex items-center',
                      isImproved ? 'text-[#36D6B0]' : isWorsened ? 'text-[#F05B67]' : 'text-[#91A0B8]'
                    )}
                  >
                    {isImproved ? (
                      <ArrowDownRight className="w-3.5 h-3.5" />
                    ) : (
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    )}
                    {m.delta > 0 ? `+${m.delta}` : m.delta}
                    {m.unit}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
