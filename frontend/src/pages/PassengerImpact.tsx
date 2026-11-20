import React, { useState, useMemo } from 'react';
import { useSimulationStore } from '../stores/simulationStore';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { MetricCard } from '../components/ui/MetricCard';
import { ConnectionStatusChart } from '../components/charts/ConnectionStatusChart';
import { ConnectionResult } from '../types';
import { Users, AlertTriangle, CheckCircle, Clock, ArrowRight, Plane } from 'lucide-react';

export const PassengerImpact: React.FC = () => {
  const { currentSimulation, baseline, connections } = useSimulationStore();
  const [filterTab, setFilterTab] = useState<'ALL' | 'FEASIBLE' | 'MISSED' | 'AT_RISK'>('ALL');

  // Active connection results (from simulation, or baseline, or synthesized from connections)
  const activeConnections: ConnectionResult[] = useMemo(() => {
    if (currentSimulation?.all_connections) return currentSimulation.all_connections;
    if (baseline?.connections) return baseline.connections;

    return connections.map((c) => ({
      ...c,
      actual_slack_minutes: null,
      status: 'FEASIBLE' as const,
    }));
  }, [currentSimulation, baseline, connections]);

  // Passenger summary statistics
  const totalConnections = activeConnections.length || 21;
  const missedConnections = activeConnections.filter(
    (c) => c.status === 'MISSED' || c.status === 'DISRUPTED'
  );
  const atRiskConnections = activeConnections.filter((c) => c.status === 'AT_RISK');
  const feasibleConnections = activeConnections.filter((c) => c.status === 'FEASIBLE');

  const missedPassengers = missedConnections.reduce((sum, c) => sum + c.passengers, 0);
  const atRiskPassengers = atRiskConnections.reduce((sum, c) => sum + c.passengers, 0);
  const totalConnectionPax = activeConnections.reduce((sum, c) => sum + c.passengers, 0);

  // Filtered connections for the table
  const filteredList = useMemo(() => {
    if (filterTab === 'ALL') return activeConnections;
    if (filterTab === 'MISSED') {
      return activeConnections.filter(
        (c) => c.status === 'MISSED' || c.status === 'DISRUPTED'
      );
    }
    return activeConnections.filter((c) => c.status === filterTab);
  }, [activeConnections, filterTab]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#101827] border border-[#1F2E47] p-4 rounded-lg">
        <div>
          <h1 className="text-xl font-mono font-bold text-[#E8EEF8] flex items-center gap-2">
            <Users className="w-5 h-5 text-[#35B6F6]" />
            Passenger Connection & Transfer Intelligence
          </h1>
          <p className="text-xs text-[#91A0B8] mt-0.5 font-mono">
            Monitoring transfer slack feasibility across 21 multi-leg flight connections.
          </p>
        </div>

        {missedPassengers > 0 && (
          <div className="px-3 py-1.5 bg-[#F05B67]/15 border border-[#F05B67]/30 rounded-lg text-xs font-mono text-[#F05B67] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              {missedPassengers} Passengers Stranded ({missedConnections.length} missed transfers)
            </span>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Total Connections"
          value={totalConnections}
          subtext={`${totalConnectionPax} connecting passengers`}
          icon={Users}
          variant="default"
        />
        <MetricCard
          label="Feasible Transfers"
          value={feasibleConnections.length}
          subtext="Slack ≥ min connection window"
          icon={CheckCircle}
          variant="success"
        />
        <MetricCard
          label="At-Risk Transfers"
          value={atRiskConnections.length}
          subtext={`${atRiskPassengers} passengers with buffer < 15m`}
          icon={Clock}
          variant={atRiskConnections.length > 0 ? 'warning' : 'default'}
        />
        <MetricCard
          label="Missed Connections"
          value={missedConnections.length}
          subtext={`${missedPassengers} stranded transfer pax`}
          icon={AlertTriangle}
          variant={missedConnections.length > 0 ? 'critical' : 'success'}
        />
      </div>

      {/* Connection Distribution Chart & Audit */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card
            title="Transfer Status Distribution"
            subtitle="Ratio of feasible vs missed connections"
          >
            <ConnectionStatusChart connections={activeConnections} />
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card
            title="Connection Feasibility Algorithm"
            subtitle="Deterministic transfer slack calculation rules"
          >
            <div className="space-y-3 text-xs font-mono text-[#91A0B8] leading-relaxed">
              <div className="p-3 bg-[#101827] rounded border border-[#1F2E47]">
                <code className="text-[#35B6F6] font-bold block mb-1">
                  Actual Slack = actual_dep(to_flight) - actual_arr(from_flight)
                </code>
                <span>
                  • <strong>FEASIBLE:</strong> Actual Slack ≥ min_connect_minutes (passengers make connecting flight).
                </span>
                <br />
                <span>
                  • <strong>MISSED:</strong> Actual Slack &lt; min_connect_minutes (insufficient time for bag transfer & gate transit).
                </span>
              </div>
              <p className="text-[11px] text-[#91A0B8]/80">
                Note on dataset limitations: Passenger counts across connection records may overlap in multi-leg itineraries. Calculations use the exact declared passengers per connection.
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* Connections Table with Tabs */}
      <Card
        title="Passenger Connections Ledger (21 Itineraries)"
        subtitle="Real-time slack and feasibility verification"
        action={
          <div className="flex items-center gap-1 bg-[#101827] border border-[#1F2E47] p-1 rounded-lg">
            {(['ALL', 'FEASIBLE', 'MISSED', 'AT_RISK'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterTab(tab)}
                className={`px-3 py-1 text-xs font-mono rounded font-semibold uppercase transition ${
                  filterTab === tab
                    ? 'bg-[#35B6F6] text-[#080D18]'
                    : 'text-[#91A0B8] hover:text-[#E8EEF8]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-[#1F2E47] text-[#91A0B8] uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Connection ID</th>
                <th className="py-2.5 px-3">Transfer Hub</th>
                <th className="py-2.5 px-3">Inbound Flight</th>
                <th className="py-2.5 px-3">Outbound Flight</th>
                <th className="py-2.5 px-3">Passengers</th>
                <th className="py-2.5 px-3">Min Connect</th>
                <th className="py-2.5 px-3">Actual Slack</th>
                <th className="py-2.5 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2E47]/50">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#91A0B8]">
                    No connections found for tab "{filterTab}".
                  </td>
                </tr>
              ) : (
                filteredList.map((conn) => {
                  const isMissed = conn.status === 'MISSED' || conn.status === 'DISRUPTED';
                  const isAtRisk = conn.status === 'AT_RISK';

                  return (
                    <tr
                      key={conn.connection_id}
                      className="hover:bg-[#1B293F]/50 transition"
                    >
                      <td className="py-2.5 px-3 font-bold text-[#E8EEF8]">
                        {conn.connection_id}
                      </td>
                      <td className="py-2.5 px-3 text-[#35B6F6] font-semibold">
                        {conn.airport} Hub
                      </td>
                      <td className="py-2.5 px-3 text-[#E8EEF8]">
                        <span className="flex items-center gap-1">
                          <Plane className="w-3 h-3 text-[#91A0B8]" />
                          {conn.from_flight}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[#E8EEF8]">
                        <span className="flex items-center gap-1">
                          <ArrowRight className="w-3 h-3 text-[#35B6F6]" />
                          {conn.to_flight}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-[#E8EEF8]">
                        {conn.passengers} PAX
                      </td>
                      <td className="py-2.5 px-3 text-[#91A0B8]">
                        {conn.min_connect_minutes} mins
                      </td>
                      <td className="py-2.5 px-3">
                        {conn.actual_slack_minutes !== null ? (
                          <span
                            className={
                              isMissed
                                ? 'text-[#F05B67] font-bold'
                                : isAtRisk
                                ? 'text-[#F5B942] font-semibold'
                                : 'text-[#36D6B0]'
                            }
                          >
                            {conn.actual_slack_minutes} mins
                          </span>
                        ) : (
                          <span className="text-[#91A0B8]">--</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <Badge status={conn.status} size="sm" />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
