import React from 'react';
import { clsx } from 'clsx';
import { Plane } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Calculating cascade propagation...',
  size = 'md',
  fullScreen = false,
}) => {
  const content = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className="relative flex items-center justify-center">
        <div
          className={clsx(
            'border-2 border-[#1F2E47] border-t-[#35B6F6] rounded-full animate-spin',
            size === 'sm' && 'w-6 h-6',
            size === 'md' && 'w-10 h-10',
            size === 'lg' && 'w-16 h-16'
          )}
        />
        <Plane
          className={clsx(
            'text-[#35B6F6] absolute transform -rotate-45',
            size === 'sm' && 'w-3 h-3',
            size === 'md' && 'w-5 h-5',
            size === 'lg' && 'w-8 h-8'
          )}
        />
      </div>
      {message && (
        <p className="text-xs font-mono text-[#91A0B8] tracking-wider uppercase animate-pulse">
          {message}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-[#080D18]/80 backdrop-blur-sm z-50 flex items-center justify-center">
        {content}
      </div>
    );
  }

  return <div className="py-12 flex justify-center">{content}</div>;
};
