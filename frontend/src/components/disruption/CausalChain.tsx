import React from 'react';
import { ChevronRight, AlertOctagon, Plane, Clock, GitCommit } from 'lucide-react';
import { clsx } from 'clsx';

interface CausalChainProps {
  chain: string[];
  primaryCause?: string | null;
  className?: string;
}

export const CausalChain: React.FC<CausalChainProps> = ({
  chain,
  primaryCause,
  className,
}) => {
  if (!chain || chain.length === 0) {
    return (
      <div className={clsx('text-xs text-[#91A0B8] font-mono', className)}>
        No causal disruption chain recorded (nominal operations).
      </div>
    );
  }

  const getStepIcon = (text: string, index: number) => {
    const t = text.toUpperCase();
    if (t.includes('CLOSURE') || t.includes('GROUND STOP') || index === 0) {
      return AlertOctagon;
    }
    if (t.includes('TURNAROUND') || t.includes('MIN_TURNAROUND')) {
      return Clock;
    }
    if (t.includes('FLIGHT') || t.includes('AIRCRAFT')) {
      return Plane;
    }
    return GitCommit;
  };

  return (
    <div className={clsx('w-full', className)}>
      <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
        {chain.map((step, idx) => {
          const Icon = getStepIcon(step, idx);
          const isFirst = idx === 0;
          const isLast = idx === chain.length - 1;

          return (
            <React.Fragment key={idx}>
              <div
                className={clsx(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded border transition',
                  isFirst
                    ? 'bg-[#F05B67]/20 border-[#F05B67]/40 text-[#F05B67] font-bold'
                    : isLast
                    ? 'bg-[#F5B942]/20 border-[#F5B942]/40 text-[#F5B942] font-semibold'
                    : 'bg-[#151F30] border-[#1F2E47] text-[#E8EEF8]'
                )}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{step}</span>
              </div>
              {!isLast && (
                <ChevronRight className="w-4 h-4 text-[#91A0B8]/60 shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
