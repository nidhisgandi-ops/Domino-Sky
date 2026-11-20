import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Timeline } from '../ui/Timeline';
import { useSimulationStore } from '../../stores/simulationStore';

export const Layout: React.FC = () => {
  const { loadInitialData, error } = useSimulationStore();

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  return (
    <div className="flex h-screen w-screen bg-[#080D18] text-[#E8EEF8] overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Body */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />

        {/* Global Error Banner */}
        {error && (
          <div className="bg-[#F05B67]/15 border-b border-[#F05B67]/30 px-6 py-2 text-xs font-mono text-[#F05B67] flex items-center justify-between">
            <span>DISRUPTION ENGINE NOTICE: {error}</span>
          </div>
        )}

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-aviation-grid">
          <Outlet />
        </main>

        {/* Persistent Flight Simulation Scrubber */}
        <div className="p-3 bg-[#101827] border-t border-[#1F2E47]">
          <Timeline />
        </div>
      </div>
    </div>
  );
};
