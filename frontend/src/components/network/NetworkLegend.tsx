import React from 'react';

export const NetworkLegend: React.FC = () => {
  return (
    <div className="bg-[#101827]/90 backdrop-blur-md border border-[#1F2E47] p-3 rounded-lg text-xs font-mono shadow-xl space-y-2.5">
      <div className="text-[11px] font-bold tracking-wider text-[#91A0B8] uppercase border-b border-[#1F2E47] pb-1">
        Network Legend
      </div>

      {/* Hub Tiers */}
      <div>
        <div className="text-[10px] text-[#91A0B8] mb-1">AIRPORT TIERS</div>
        <div className="grid grid-cols-1 gap-1 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-[#35B6F6] shrink-0 border border-white/20" />
            <span className="text-[#E8EEF8]">Mega Hub (DEL, BOM, BLR, HYD)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#36D6B0] shrink-0 border border-white/20" />
            <span className="text-[#E8EEF8]">Regional Hub (MAA, CCU, AMD, COK)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#91A0B8] shrink-0 border border-white/20" />
            <span className="text-[#91A0B8]">Spoke Airport</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#F05B67] shrink-0 animate-pulse border border-[#F05B67]" />
            <span className="text-[#F05B67] font-semibold">Closed / Ground Stop Hub</span>
          </div>
        </div>
      </div>

      {/* Route States */}
      <div>
        <div className="text-[10px] text-[#91A0B8] mb-1">FLIGHT ROUTE STATUS</div>
        <div className="grid grid-cols-1 gap-1 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="w-5 h-0.5 bg-[#36D6B0]" />
            <span className="text-[#E8EEF8]">On Time / Nominal</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-0.5 bg-[#F5B942]" />
            <span className="text-[#F5B942]">Delayed</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-0.5 bg-[#F05B67]" />
            <span className="text-[#F05B67]">Cancelled / Blocked</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-0.5 bg-[#35B6F6]/40" />
            <span className="text-[#91A0B8]">Scheduled Flight Arc</span>
          </div>
        </div>
      </div>
    </div>
  );
};
