import React, { useMemo } from 'react';
import { useSimulationStore } from '../stores/simulationStore';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { MetricCard } from '../components/ui/MetricCard';
import { CrewDutyChart } from '../components/charts/CrewDutyChart';
import { CrewStatus } from '../types';
import { Clock, ShieldAlert, CheckCircle, AlertTriangle, UserCheck } from 'lucide-react';
import { clsx } from 'clsx';

export const CrewOperations: React.FC = () => {
  const { currentSimulation, baseline, crews } = useSimulationStore();

  // Active crew status list
  const activeCrewStatus: CrewStatus[] = useMemo(() => {
    if (currentSimulation?.crew_status) return currentSimulation.crew_status;
    if (baseline?.crew_status) return baseline.crew_status;

    // Fallback based on dataset crews
    return crews.map((c) => ({
      crew_id: c.crew_id,
      tail_id: c.tail_id,
      base: c.base,
      duty_start: c.duty_start,
      max_duty_mins: c.max_duty_mins,
      actual_duty_mins: null,
      last_flight_actual_arr: null,
      remaining_duty_mins: null,
      status: 'OK' as const,
    }));
  }, [currentSimulation, baseline, crews]);

  const totalCrews = activeCrewStatus.length || 16;
  const violations = activeCrewStatus.filter((c) => c.status === 'VIOLATION');
  const warnings = activeCrewStatus.filter((c) => c.status === 'WARNING');
  const compliant = activeCrewStatus.filter((c) => c.status === 'OK');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#101827] border border-[#1F2E47] p-4 rounded-lg">
        <div>
          <h1 className="text-xl font-mono font-bold text-[#E8EEF8] flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#35B6F6]" />
            Flight Crew Duty Limit Monitoring
          </h1>
          <p className="text-xs text-[#91A0B8] mt-0.5 font-mono">
            DGCA-aligned regulatory monitoring (Max 600m / 10h duty per single operating day).
          </p>
        </div>

        {violations.length > 0 && (
          <div className="px-3 py-1.5 bg-[#F05B67]/15 border border-[#F05B67]/30 rounded-lg text-xs font-mono text-[#F05B67] flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>
              {violations.length} Crew Duty Violation(s) Detected
            </span>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Total Crew Complements"
          value={totalCrews}
          subtext="16 cockpit & cabin crews"
          icon={UserCheck}
          variant="default"
        />
        <MetricCard
          label="Compliant Rosters"
          value={compliant.length}
          subtext="> 60m buffer remaining"
          icon={CheckCircle}
          variant="success"
        />
        <MetricCard
          label="Duty Warning Threshold"
          value={warnings.length}
          subtext="0 - 60m remaining duty"
          icon={AlertTriangle}
          variant={warnings.length > 0 ? 'warning' : 'default'}
        />
        <MetricCard
          label="Duty Violations"
          value={violations.length}
          subtext="Exceeds 600 mins max limit"
          icon={ShieldAlert}
          variant={violations.length > 0 ? 'critical' : 'success'}
        />
      </div>

      {/* Regulatory Context Banner */}
      <div className="bg-[#151F30] border border-[#1F2E47] p-4 rounded-lg flex items-start gap-3">
        <Clock className="w-5 h-5 text-[#35B6F6] shrink-0 mt-0.5" />
        <div className="text-xs font-mono text-[#91A0B8] space-y-1">
          <p className="text-[#E8EEF8] font-bold">
            Policy Disclosure: 60-Minute Duty Buffer Warning Zone
          </p>
          <p>
            Actual Duty = <code>actual_arrival_of_last_assigned_flight - duty_start</code>. If remaining buffer is ≤ 60 minutes, crew is flagged as <strong>WARNING</strong> to prevent mid-air timeout risks. Over 600 minutes is flagged as regulatory <strong>VIOLATION</strong>.
          </p>
        </div>
      </div>

      {/* Duty Utilization Bar Chart */}
      <Card
        title="Crew Duty Utilization vs 600-Minute Limit"
        subtitle="Comparing actual duty elapsed against regulatory ceiling"
      >
        <CrewDutyChart crews={activeCrewStatus} />
      </Card>

      {/* Crew Records Table */}
      <Card
        title="Crew Assignment Ledger (16 Crews)"
        subtitle="Roster status, base airport, and remaining duty hours"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-[#1F2E47] text-[#91A0B8] uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Crew ID</th>
                <th className="py-2.5 px-3">Base Hub</th>
                <th className="py-2.5 px-3">Assigned Tail</th>
                <th className="py-2.5 px-3">Duty Start</th>
                <th className="py-2.5 px-3">Last Flight Arrival</th>
                <th className="py-2.5 px-3">Duty Elapsed / Max</th>
                <th className="py-2.5 px-3">Duty Utilization</th>
                <th className="py-2.5 px-3">Remaining</th>
                <th className="py-2.5 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2E47]/50">
              {activeCrewStatus.map((crew) => {
                const actual = crew.actual_duty_mins || 0;
                const maxDuty = crew.max_duty_mins || 600;
                const utilPct = Math.min(100, Math.round((actual / maxDuty) * 100));
                const remaining = crew.remaining_duty_mins !== null ? crew.remaining_duty_mins : maxDuty - actual;

                const isViolation = crew.status === 'VIOLATION' || remaining <= 0;
                const isWarning = crew.status === 'WARNING' || (remaining > 0 && remaining <= 60);

                return (
                  <tr
                    key={crew.crew_id}
                    className="hover:bg-[#1B293F]/50 transition"
                  >
                    <td className="py-2.5 px-3 font-bold text-[#E8EEF8]">
                      {crew.crew_id}
                    </td>
                    <td className="py-2.5 px-3 text-[#35B6F6] font-semibold">
                      {crew.base}
                    </td>
                    <td className="py-2.5 px-3 text-[#E8EEF8]">
                      {crew.tail_id}
                    </td>
                    <td className="py-2.5 px-3 text-[#91A0B8]">
                      {crew.duty_start} IST
                    </td>
                    <td className="py-2.5 px-3 text-[#91A0B8]">
                      {crew.last_flight_actual_arr || '--:--'}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-[#E8EEF8]">
                      {actual}m / {maxDuty}m
                    </td>
                    <td className="py-2.5 px-3 min-w-[140px]">
                      {/* Progress Bar */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-[#101827] rounded-full overflow-hidden border border-[#1F2E47]">
                          <div
                            className={clsx(
                              'h-full rounded-full transition-all duration-300',
                              isViolation
                                ? 'bg-[#F05B67]'
                                : isWarning
                                ? 'bg-[#F5B942]'
                                : 'bg-[#36D6B0]'
                            )}
                            style={{ width: `${utilPct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-[#91A0B8] w-8 text-right">
                          {utilPct}%
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-bold">
                      <span
                        className={
                          isViolation
                            ? 'text-[#F05B67]'
                            : isWarning
                            ? 'text-[#F5B942]'
                            : 'text-[#36D6B0]'
                        }
                      >
                        {remaining}m
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <Badge status={crew.status} size="sm" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
