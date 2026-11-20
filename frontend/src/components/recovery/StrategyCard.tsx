import React from 'react';
import { RecoveryEvaluation, FlightResult, SpareAircraft } from '../../types';
import { clsx } from 'clsx';
import { Plane, AlertTriangle, CheckCircle, Ban, RefreshCw, ArrowRight } from 'lucide-react';
import { Badge } from '../ui/Badge';

interface StrategyCardProps {
  actionType: 'CANCEL_FLIGHT' | 'SUBSTITUTE_AIRCRAFT';
  targetFlight: FlightResult;
  spareAircraft?: SpareAircraft;
  evaluation?: RecoveryEvaluation | null;
  isEvaluating?: boolean;
  isApplying?: boolean;
  onEvaluate: () => void;
  onApply: () => void;
}

export const StrategyCard: React.FC<StrategyCardProps> = ({
  actionType,
  targetFlight,
  spareAircraft,
  evaluation,
  isEvaluating = false,
  isApplying = false,
  onEvaluate,
  onApply,
}) => {
  const isCancellation = actionType === 'CANCEL_FLIGHT';

  return (
    <div
      className={clsx(
        'bg-[#151F30] border rounded-lg p-5 transition duration-200 flex flex-col justify-between',
        evaluation?.feasible === false
          ? 'border-[#F05B67]/30 bg-[#151F30]/60'
          : evaluation?.feasible === true
          ? 'border-[#36D6B0]/50 shadow-[0_0_15px_rgba(54,214,176,0.1)]'
          : 'border-[#1F2E47] hover:border-[#2D3F5E]'
      )}
    >
      <div>
        {/* Header Badge & Action Name */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div
              className={clsx(
                'p-2 rounded-lg border',
                isCancellation
                  ? 'bg-[#F05B67]/15 border-[#F05B67]/40 text-[#F05B67]'
                  : 'bg-[#35B6F6]/15 border-[#35B6F6]/40 text-[#35B6F6]'
              )}
            >
              {isCancellation ? <Ban className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
            </div>
            <div>
              <h4 className="text-sm font-mono font-bold text-[#E8EEF8]">
                {isCancellation
                  ? `Cancel Flight ${targetFlight.flight_id}`
                  : `Substitute with ${spareAircraft?.tail_id}`}
              </h4>
              <p className="text-xs text-[#91A0B8]">
                {targetFlight.origin} → {targetFlight.destination} ({targetFlight.pax} PAX)
              </p>
            </div>
          </div>
          <Badge
            status={isCancellation ? 'CANCELLED' : 'NORMAL'}
            label={isCancellation ? 'Cancel' : 'Substitute'}
            size="sm"
          />
        </div>

        {/* Flight Context */}
        <div className="bg-[#101827] border border-[#1F2E47] rounded p-2.5 mb-3 text-xs font-mono space-y-1">
          <div className="flex justify-between text-[#91A0B8]">
            <span>Scheduled:</span>
            <span className="text-[#E8EEF8]">
              {targetFlight.scheduled_dep} - {targetFlight.scheduled_arr}
            </span>
          </div>
          <div className="flex justify-between text-[#91A0B8]">
            <span>Current Delay:</span>
            <span className="text-[#F5B942] font-bold">
              +{targetFlight.dep_delay_minutes} mins
            </span>
          </div>
          {!isCancellation && spareAircraft && (
            <div className="flex justify-between text-[#91A0B8] border-t border-[#1F2E47] pt-1">
              <span>Spare Base:</span>
              <span className="text-[#35B6F6] font-bold">
                {spareAircraft.base} (Available {spareAircraft.available_from})
              </span>
            </div>
          )}
        </div>

        {/* Operational Disclaimer for Aircraft Substitution */}
        {!isCancellation && (
          <div className="mb-3 px-2.5 py-1.5 bg-[#F5B942]/10 border border-[#F5B942]/30 rounded text-[11px] text-[#F5B942] flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>Spare crew not provided — crew availability unverified</span>
          </div>
        )}

        {/* Evaluated Impact Results */}
        {evaluation && (
          <div className="mb-4 bg-[#101827] border border-[#1F2E47] rounded p-3 text-xs font-mono space-y-2">
            <div className="flex items-center gap-2">
              {evaluation.feasible ? (
                <CheckCircle className="w-4 h-4 text-[#36D6B0]" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-[#F05B67]" />
              )}
              <span
                className={clsx(
                  'font-bold uppercase tracking-wider',
                  evaluation.feasible ? 'text-[#36D6B0]' : 'text-[#F05B67]'
                )}
              >
                {evaluation.feasible ? 'Strategy Feasible' : 'Infeasible Action'}
              </span>
            </div>

            <p className="text-[#E8EEF8] text-[11px] leading-relaxed">
              {evaluation.impact_summary || evaluation.reason}
            </p>

            {/* Quick Metrics Delta */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#1F2E47] text-[11px]">
              <div>
                <span className="text-[#91A0B8] block text-[10px]">DELAY SAVINGS</span>
                <span className="text-[#36D6B0] font-bold">
                  {evaluation.before_metrics.total_delay_minutes -
                    evaluation.after_metrics.total_delay_minutes >
                  0
                    ? `-${
                        evaluation.before_metrics.total_delay_minutes -
                        evaluation.after_metrics.total_delay_minutes
                      }m`
                    : '0m'}
                </span>
              </div>
              <div>
                <span className="text-[#91A0B8] block text-[10px]">MISSED CONNS</span>
                <span className="text-[#E8EEF8] font-bold">
                  {evaluation.after_metrics.missed_connections} (was{' '}
                  {evaluation.before_metrics.missed_connections})
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-3 border-t border-[#1F2E47]">
        <button
          onClick={onEvaluate}
          disabled={isEvaluating}
          className="flex-1 py-2 px-3 bg-[#101827] hover:bg-[#1B293F] border border-[#1F2E47] hover:border-[#35B6F6] text-[#E8EEF8] rounded text-xs font-mono font-semibold uppercase transition disabled:opacity-50"
        >
          {isEvaluating ? 'Evaluating...' : 'Evaluate'}
        </button>

        <button
          onClick={onApply}
          disabled={Boolean(isApplying || (evaluation && !evaluation.feasible))}
          className={clsx(
            'flex-1 py-2 px-3 rounded text-xs font-mono font-bold uppercase transition flex items-center justify-center gap-1.5',
            evaluation?.feasible === false
              ? 'opacity-40 cursor-not-allowed bg-[#1F2E47] text-[#91A0B8]'
              : 'bg-[#35B6F6] hover:bg-[#35B6F6]/90 text-[#080D18]'
          )}
        >
          {isApplying ? (
            <span>Applying...</span>
          ) : (
            <>
              <span>Apply</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
