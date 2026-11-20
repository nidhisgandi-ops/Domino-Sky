import React from 'react';
import { clsx } from 'clsx';

interface StatusIndicatorProps {
  status: 'online' | 'disrupted' | 'warning' | 'idle';
  label?: string;
  pulse?: boolean;
  className?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  label,
  pulse = true,
  className,
}) => {
  const configs = {
    online: {
      color: 'bg-[#36D6B0]',
      ping: 'bg-[#36D6B0]',
      text: 'SYSTEM NOMINAL',
      textColor: 'text-[#36D6B0]',
    },
    disrupted: {
      color: 'bg-[#F05B67]',
      ping: 'bg-[#F05B67]',
      text: 'DISRUPTION ACTIVE',
      textColor: 'text-[#F05B67]',
    },
    warning: {
      color: 'bg-[#F5B942]',
      ping: 'bg-[#F5B942]',
      text: 'CASCADE AT RISK',
      textColor: 'text-[#F5B942]',
    },
    idle: {
      color: 'bg-[#91A0B8]',
      ping: 'bg-[#91A0B8]',
      text: 'STANDBY',
      textColor: 'text-[#91A0B8]',
    },
  };

  const config = configs[status];

  return (
    <div className={clsx('inline-flex items-center gap-2', className)}>
      <span className="relative flex h-2.5 w-2.5">
        {pulse && (
          <span
            className={clsx(
              'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
              config.ping
            )}
          />
        )}
        <span
          className={clsx(
            'relative inline-flex rounded-full h-2.5 w-2.5',
            config.color
          )}
        />
      </span>
      <span
        className={clsx(
          'text-xs font-mono font-semibold tracking-wider uppercase',
          config.textColor
        )}
      >
        {label || config.text}
      </span>
    </div>
  );
};
