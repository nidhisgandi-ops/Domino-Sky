import React from 'react';
import { clsx } from 'clsx';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: LucideIcon;
  variant?: 'default' | 'info' | 'success' | 'warning' | 'critical';
  trend?: {
    value: number | string;
    isPositiveGood?: boolean;
  };
  onClick?: () => void;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtext,
  icon: Icon,
  variant = 'default',
  trend,
  onClick,
  className,
}) => {
  const variantStyles = {
    default: {
      border: 'border-[#1F2E47]',
      bg: 'bg-[#151F30]',
      valueColor: 'text-[#E8EEF8]',
      iconBg: 'bg-[#1F2E47]/50 text-[#91A0B8]',
      glow: '',
    },
    info: {
      border: 'border-[#35B6F6]/40',
      bg: 'bg-[#151F30]',
      valueColor: 'text-[#35B6F6]',
      iconBg: 'bg-[#35B6F6]/15 text-[#35B6F6]',
      glow: 'shadow-[0_0_12px_rgba(53,182,246,0.15)]',
    },
    success: {
      border: 'border-[#36D6B0]/40',
      bg: 'bg-[#151F30]',
      valueColor: 'text-[#36D6B0]',
      iconBg: 'bg-[#36D6B0]/15 text-[#36D6B0]',
      glow: 'shadow-[0_0_12px_rgba(54,214,176,0.15)]',
    },
    warning: {
      border: 'border-[#F5B942]/40',
      bg: 'bg-[#151F30]',
      valueColor: 'text-[#F5B942]',
      iconBg: 'bg-[#F5B942]/15 text-[#F5B942]',
      glow: 'shadow-[0_0_12px_rgba(245,185,66,0.15)]',
    },
    critical: {
      border: 'border-[#F05B67]/40',
      bg: 'bg-[#151F30]',
      valueColor: 'text-[#F05B67]',
      iconBg: 'bg-[#F05B67]/15 text-[#F05B67]',
      glow: 'shadow-[0_0_12px_rgba(240,91,103,0.2)]',
    },
  };

  const currentVariant = variantStyles[variant];

  return (
    <div
      onClick={onClick}
      className={clsx(
        'rounded-lg p-4 border transition-all duration-200 relative overflow-hidden',
        currentVariant.bg,
        currentVariant.border,
        currentVariant.glow,
        onClick && 'cursor-pointer hover:border-[#35B6F6] hover:bg-[#1B293F]',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold tracking-wider text-[#91A0B8] uppercase">
            {label}
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span
              className={clsx(
                'text-2xl font-bold tracking-tight font-mono',
                currentVariant.valueColor
              )}
            >
              {value}
            </span>
            {trend && (
              <span className="text-xs font-medium text-[#91A0B8]">
                {trend.value}
              </span>
            )}
          </div>
          {subtext && (
            <p className="mt-1 text-xs text-[#91A0B8] font-normal">{subtext}</p>
          )}
        </div>
        {Icon && (
          <div
            className={clsx(
              'p-2.5 rounded-lg shrink-0 flex items-center justify-center',
              currentVariant.iconBg
            )}
          >
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
};
