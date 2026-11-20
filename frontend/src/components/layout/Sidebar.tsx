import React from 'react';
import { NavLink } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  Compass,
  AlertOctagon,
  GitFork,
  Users,
  Clock,
  Sparkles,
  FlaskConical,
  Plane,
} from 'lucide-react';
import { useSimulationStore } from '../../stores/simulationStore';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  badgeVariant?: 'warning' | 'critical' | 'info';
}

export const Sidebar: React.FC = () => {
  const { currentSimulation } = useSimulationStore();

  const navItems: NavItem[] = [
    {
      name: 'Command Centre',
      path: '/',
      icon: LayoutDashboard,
    },
    {
      name: 'Live Network',
      path: '/network',
      icon: Compass,
      badge: currentSimulation ? 'LIVE' : undefined,
      badgeVariant: 'info',
    },
    {
      name: 'Disruption Control',
      path: '/disruption-control',
      icon: AlertOctagon,
      badge: currentSimulation?.airport_id,
      badgeVariant: 'critical',
    },
    {
      name: 'Cascade Analysis',
      path: '/cascade',
      icon: GitFork,
      badge: currentSimulation?.metrics.delayed_flights || undefined,
      badgeVariant: 'warning',
    },
    {
      name: 'Passenger Impact',
      path: '/passengers',
      icon: Users,
      badge: currentSimulation?.metrics.missed_connections || undefined,
      badgeVariant: 'critical',
    },
    {
      name: 'Crew Operations',
      path: '/crew',
      icon: Clock,
      badge: currentSimulation?.metrics.crew_violations || undefined,
      badgeVariant: 'critical',
    },
    {
      name: 'AI Dispatcher',
      path: '/dispatcher',
      icon: Sparkles,
      badge: currentSimulation ? 'READY' : undefined,
      badgeVariant: 'info',
    },
    {
      name: 'Scenario Lab',
      path: '/scenarios',
      icon: FlaskConical,
    },
  ];

  return (
    <aside className="w-64 bg-[#101827] border-r border-[#1F2E47] flex flex-col shrink-0 select-none">
      {/* Brand Logo Header */}
      <div className="h-16 px-5 border-b border-[#1F2E47] flex items-center gap-3 bg-[#080D18]/80">
        <div className="p-2 bg-[#35B6F6]/10 border border-[#35B6F6]/30 rounded-lg text-[#35B6F6]">
          <Plane className="w-5 h-5 -rotate-45" />
        </div>
        <div>
          <h1 className="font-mono font-bold tracking-wider text-base text-[#E8EEF8] flex items-center gap-1.5">
            DOMINO<span className="text-[#35B6F6]">SKY</span>
          </h1>
          <p className="text-[10px] font-mono tracking-widest text-[#91A0B8] uppercase">
            Disruption Simulator
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-mono tracking-wider text-[#91A0B8]/70 uppercase">
          Operations Monitor
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                clsx(
                  'flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group',
                  isActive
                    ? 'bg-[#151F30] text-[#35B6F6] border border-[#35B6F6]/40 shadow-[0_0_12px_rgba(53,182,246,0.15)] font-semibold'
                    : 'text-[#91A0B8] hover:bg-[#151F30]/60 hover:text-[#E8EEF8]'
                )
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
                <span>{item.name}</span>
              </div>
              {item.badge !== undefined && (
                <span
                  className={clsx(
                    'px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded',
                    item.badgeVariant === 'critical' && 'bg-[#F05B67]/20 text-[#F05B67]',
                    item.badgeVariant === 'warning' && 'bg-[#F5B942]/20 text-[#F5B942]',
                    item.badgeVariant === 'info' && 'bg-[#35B6F6]/20 text-[#35B6F6]'
                  )}
                >
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Sidebar Footer / System Badge */}
      <div className="p-4 border-t border-[#1F2E47] bg-[#080D18]/40">
        <div className="flex items-center justify-between text-xs text-[#91A0B8] font-mono">
          <span>AIRLINE TWIN</span>
          <span className="text-[#36D6B0] font-semibold">ONLINE</span>
        </div>
        <div className="mt-1 text-[11px] text-[#91A0B8]/70">
          Indian Airspace Network (16 hubs)
        </div>
      </div>
    </aside>
  );
};
