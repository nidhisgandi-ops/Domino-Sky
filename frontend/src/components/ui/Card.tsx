import React from 'react';
import { clsx } from 'clsx';

interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  subtitle?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  variant?: 'default' | 'glow' | 'warning' | 'critical' | 'secondary';
  headerBorder?: boolean;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  badge,
  action,
  variant = 'default',
  headerBorder = true,
  className,
  children,
  ...props
}) => {
  const variantStyles = {
    default: 'bg-[#151F30] border-[#1F2E47]',
    secondary: 'bg-[#101827] border-[#1F2E47]',
    glow: 'bg-[#151F30] border-[#35B6F6]/50 shadow-[0_0_15px_rgba(53,182,246,0.15)]',
    warning: 'bg-[#151F30] border-[#F5B942]/50 shadow-[0_0_15px_rgba(245,185,66,0.15)]',
    critical: 'bg-[#151F30] border-[#F05B67]/50 shadow-[0_0_15px_rgba(240,91,103,0.2)]',
  };

  return (
    <div
      className={clsx(
        'rounded-lg border transition-all duration-200 overflow-hidden',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {(title || subtitle || action || badge) && (
        <div
          className={clsx(
            'flex items-center justify-between px-4 py-3 bg-[#101827]/70',
            headerBorder && 'border-b border-[#1F2E47]'
          )}
        >
          <div className="flex items-center gap-2">
            <div>
              {typeof title === 'string' ? (
                <h3 className="font-semibold text-sm tracking-wide text-[#E8EEF8] uppercase flex items-center gap-2">
                  {title}
                </h3>
              ) : (
                title
              )}
              {subtitle && (
                <p className="text-xs text-[#91A0B8] mt-0.5">{subtitle}</p>
              )}
            </div>
            {badge && <div className="ml-2">{badge}</div>}
          </div>
          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
};
