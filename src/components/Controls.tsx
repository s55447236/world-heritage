import React from 'react';
import { useStore } from '../store';
import { RotateCcw, Play, Pause, Globe, Map as MapIcon } from 'lucide-react';

export const Controls = () => {
  const { viewMode, setViewMode, isRotating, setRotating, sites } = useStore();
  const totalSites = sites.length;
  const totalCountries = Array.from(new Set(sites.map((site) => site.country))).length;

  const buttons = [
    { id: 'flat', label: 'Flat', icon: MapIcon, active: viewMode === 'flat', onClick: () => setViewMode('flat') },
    { id: 'sphere', label: 'Standing', icon: Globe, active: viewMode === 'sphere', onClick: () => setViewMode('sphere') },
  ];

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-4 pointer-events-auto">
      {/* Main Controls */}
        <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-full px-6 py-3 flex items-center gap-6 shadow-2xl">
        <div className="flex items-center gap-2 text-white/60 text-[10px] font-medium uppercase tracking-widest mr-4">
          <span className="text-white">{totalSites}</span> sites
          <span className="text-white ml-2">{totalCountries}</span> countries
        </div>
        
        <div className="h-6 w-[1px] bg-white/10" />

        <div className="flex items-center gap-1">
          {buttons.map((btn) => (
            <button
              key={btn.id}
              onClick={btn.onClick}
              className={`cursor-pointer px-4 py-1.5 rounded-full text-[11px] font-medium transition-all flex items-center gap-2 ${
                btn.active 
                ? 'bg-white text-black' 
                : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        <div className="h-6 w-[1px] bg-white/10" />

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setRotating(true)}
            className="cursor-pointer text-white/60 hover:text-white flex flex-col items-center gap-1"
          >
            <RotateCcw size={14} />
            <span className="text-[8px] uppercase tracking-tighter">Reset</span>
          </button>
          <button 
            onClick={() => setRotating(!isRotating)}
            className="cursor-pointer text-white/60 hover:text-white flex flex-col items-center gap-1 min-w-[40px]"
          >
            {isRotating ? <Pause size={14} /> : <Play size={14} />}
            <span className="text-[8px] uppercase tracking-tighter">{isRotating ? 'Pause' : 'Start'}</span>
          </button>
        </div>
      </div>

      {/* Sub Controls */}
      <div className="flex items-center gap-2">
        {['Labels', 'Origins', 'Ring', 'Ring2', 'Ring3', 'Aurora'].map((label) => (
          <button 
            key={label}
            className="cursor-pointer px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[9px] text-white/50 hover:text-white transition-all uppercase tracking-widest"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};
