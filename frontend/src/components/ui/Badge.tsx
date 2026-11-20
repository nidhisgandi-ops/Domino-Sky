import React from 'react';
import { clsx } from 'clsx';

export type BadgeStatus =
  | 'ON_TIME'
  | 'NORMAL'
  | 'DELAYED'
  | 'CANCELLED'
  | 'BLOCKED'
  | 'FEASIBLE'
  | 'MISSED'
  | 'AT_RISK'
  | 'DISRUPTED'
  | 'OK'
  | 'WARNING'
  | 'VIOLATION'
  | 'mega_hub'
  | 'regional_hub'
  | 'spoke'
  | 'INFO';

interface BadgeProps {
  status: BadgeStatus | string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  status,
  label,
  size = 'md',
  dot = true,
  className,
}) => {
  const normStatus = (status || '').toUpperCase();

  let colorClasses = 'bg-[#1F2E47]/60 text-[#E8EEF8] border-[#2D3F5E]';
  let dotColor = 'bg-[#91A0B8]';

  switch (normStatus) {
    case 'ON_TIME':
    case 'NORMAL':
    case 'FEASIBLE':
    case 'OK':
    case 'REGIONAL_HUB':
      colorClasses = 'bg-[#36D6B0]/15 text-[#36D6B0] border-[#36D6B0]/40';
      dotColor = 'bg-[#36D6B0]';
      break;
    case 'DELAYED':
    case 'AT_RISK':
    case 'WARNING':
      colorClasses = 'bg-[#F5B942]/15 text-[#F5B942] border-[#F5B942]/40';
      dotColor = 'bg-[#F5B942]';
      break;
    case 'CANCELLED':
    case 'MISSED':
    case 'VIOLATION':
    case 'BLOCKED':
    case 'DISRUPTED':
    case 'CRITICAL':
      colorClasses = 'bg-[#F05B67]/15 text-[#F05B67] border-[#F05B67]/40';
      dotColor = 'bg-[#F05B67] animate-pulse';
      break;
    case 'MEGA_HUB':
    case 'INFO':
      colorClasses = 'bg-[#35B6F6]/15 text-[#35B6F6] border-[#35B6F6]/40';
      dotColor = 'bg-[#35B6F6]';
      break;
    case 'SPOKE':
      colorClasses = 'bg-[#91A0B8]/15 text-[#91A0B8] border-[#91A0B8]/30';
      dotColor = 'bg-[#91A0B8]';
      break;
  }

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2 py-0.5 gap-1.5 font-medium',
    lg: 'text-sm px-3 py-1 gap-2 font-semibold',
  };

  const displayText = label || status.replace('_', ' ');

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full border tracking-wide uppercase',
        sizeClasses[size],
        colorClasses,
        className
      )}
    >
      {dot && <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', dotColor)} />}
      <span>{displayText}</span>
    </span>
  );
};
