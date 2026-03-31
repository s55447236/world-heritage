/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Environment } from '@react-three/drei';
import { Globe } from './components/Globe';
import { Sidebar } from './components/Sidebar';
import { Controls } from './components/Controls';
import { ArtifactOverlay } from './components/ArtifactOverlay';
import { useStore } from './store';

export default function App() {
  const { sites, initializeSites, viewMode } = useStore();
  const controlsRef = useRef<any>(null);

  React.useEffect(() => {
    void initializeSites();
  }, [initializeSites]);

  React.useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    controls.target.set(0, 0, 0);
    controls.object.position.set(0, 0, 12);
    controls.object.up.set(0, 1, 0);
    controls.object.lookAt(0, 0, 0);
    controls.update();
  }, [viewMode]);

  const totalSites = sites.length;
  const totalCountries = Array.from(new Set(sites.map(s => s.country))).length;
  const totalContinents = Array.from(new Set(sites.map((site) => site.continent))).length;
  return (
    <div className="relative w-full h-screen bg-[#050505] overflow-hidden">
      {/* 3D Scene */}
      <Canvas
        camera={{ position: [0, 0, 12], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={1} />
          <pointLight position={[10, 10, 10]} intensity={2} />
          
          <Globe />
          
          <Stars radius={100} depth={55} count={2800} factor={5.5} saturation={0} fade speed={1.2} />
          
          <OrbitControls
            ref={controlsRef}
            enablePan={false} 
            minDistance={5} 
            maxDistance={30}
            autoRotate={false}
          />
        </Suspense>
      </Canvas>

      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top Header */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 text-center">
          <h1 className="text-white text-4xl font-serif italic tracking-tight mb-1">
            World Heritage
          </h1>
          <div className="text-white/40 text-[10px] uppercase tracking-[0.3em]">
            {totalSites} sites · {totalCountries} countries · {totalContinents} continents
          </div>
        </div>

        <Sidebar />
        <ArtifactOverlay />
        <Controls />
        
        {/* Decorative elements */}
        <div className="absolute bottom-4 right-8 flex flex-col items-end gap-4 pointer-events-auto">
          <div className="flex flex-col items-center gap-1 group cursor-pointer">
            <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white group-hover:bg-white group-hover:text-black transition-all">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
            </div>
            <span className="text-[10px] text-white/50">Save</span>
          </div>
          <div className="flex flex-col items-center gap-1 group cursor-pointer">
            <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white group-hover:bg-white group-hover:text-black transition-all">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
            </div>
            <span className="text-[10px] text-white/50">Share</span>
          </div>
        </div>
      </div>
    </div>
  );
}
