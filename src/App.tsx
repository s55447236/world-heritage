/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Environment } from '@react-three/drei';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { Globe } from './components/Globe';
import { Sidebar } from './components/Sidebar';
import { Controls } from './components/Controls';
import { ArtifactOverlay } from './components/ArtifactOverlay';
import { useStore } from './store';

export default function App() {
  const { sites, initializeSites, viewMode } = useStore();
  const controlsRef = useRef<any>(null);
  const [shareLabel, setShareLabel] = React.useState('Share');
  const [showShareToast, setShowShareToast] = React.useState(false);
  const [showContactModal, setShowContactModal] = React.useState(false);

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

  const handleShare = React.useCallback(async () => {
    const shareUrl = 'https://world-heritage-seven.vercel.app/';
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareLabel('Copied');
      setShowShareToast(true);
    } catch {
      setShareLabel('Share');
    } finally {
      window.setTimeout(() => {
        setShareLabel('Share');
        setShowShareToast(false);
      }, 1800);
    }
  }, []);

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
          
          <Stars radius={100} depth={60} count={3400} factor={7.2} saturation={0.12} fade speed={1.1} />
          
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
        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-center">
          <h1 className="text-white text-4xl font-serif italic tracking-tight mb-1">
            World Heritage
          </h1>
          <div className="text-white/40 text-[10px] tracking-[0.18em]">
            Every heritage site is a mark left by humanity on the map of time.
          </div>
        </div>

        <Sidebar />
        <ArtifactOverlay />
        <Controls />

        <AnimatePresence>
          {showShareToast && (
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.96, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: 12, scale: 0.98, filter: 'blur(6px)' }}
              transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
              className="absolute bottom-28 right-8 z-[100] pointer-events-none"
            >
              <div className="rounded-2xl border border-white/15 bg-black/82 px-4 py-3 shadow-[0_24px_60px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
                <p className="text-sm font-medium text-white">Link copied</p>
                <p className="mt-1 text-xs text-white/60">Thanks for sharing World Heritage.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showContactModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[110] flex items-center justify-center bg-black/55 px-4 py-6 backdrop-blur-sm pointer-events-auto"
              onClick={() => setShowContactModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 18, scale: 0.98 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                className="w-full max-w-[680px] rounded-[32px] border border-white/18 bg-[#1f1f1f]/95 p-8 shadow-[0_30px_100px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="mb-6 flex items-start justify-between gap-6">
                  <div>
                    <h2 className="font-serif text-[2.2rem] italic leading-none text-white">Contact Developer</h2>
                    <div className="mt-4 space-y-2 text-white/72">
                      <p className="text-lg">Zhang Xumeng</p>
                      <p className="text-lg">18612033945 (same on WeChat)</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowContactModal(false)}
                    className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/14 bg-white/6 text-white/60 transition-colors hover:text-white"
                    aria-label="Close contact modal"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-[28px] border border-white/14 bg-white/[0.04] p-5">
                    <h3 className="text-center text-[1.7rem] font-serif italic text-white">WeChat</h3>
                    <div className="mx-auto mt-4 aspect-square w-full max-w-[240px] overflow-hidden rounded-[24px] border border-white/10 bg-[#101010]">
                      <img
                        src="/images/contact/wechat-qr.png"
                        alt="WeChat QR code"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <p className="mt-4 text-center text-sm leading-relaxed text-white/55">
                      Add me for feedback, questions, or suggestions.
                    </p>
                  </div>

                  <div className="rounded-[28px] border border-white/14 bg-white/[0.04] p-5">
                    <h3 className="text-center text-[1.7rem] font-serif italic text-white">Support</h3>
                    <div className="mx-auto mt-4 aspect-square w-full max-w-[240px] overflow-hidden rounded-[24px] border border-white/10 bg-[#101010]">
                      <img
                        src="/images/contact/support-qr.png"
                        alt="Support QR code"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <p className="mt-4 text-center text-sm leading-relaxed text-white/55">
                      You are welcome to buy me a coffee.
                    </p>
                  </div>
                </div>

                <p className="mt-6 text-center text-sm leading-relaxed text-white/52">
                  Thanks for your support. Wishing you smooth work and long-lasting inspiration.
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Decorative elements */}
        <div className="absolute bottom-4 right-8 flex flex-col items-end gap-4 pointer-events-auto">
          <button
            type="button"
            onClick={() => setShowContactModal(true)}
            className="flex flex-col items-center gap-1 group cursor-pointer"
            aria-label="Open contact modal"
          >
            <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white group-hover:bg-white group-hover:text-black transition-all">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
            </div>
            <span className="text-[10px] text-white/50">Save</span>
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="flex flex-col items-center gap-1 group cursor-pointer"
            aria-label="Share website"
          >
            <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white group-hover:bg-white group-hover:text-black transition-all">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3"></circle>
                <circle cx="6" cy="12" r="3"></circle>
                <circle cx="18" cy="19" r="3"></circle>
                <path d="M8.59 13.51 15.42 17.49"></path>
                <path d="M15.41 6.51 8.59 10.49"></path>
              </svg>
            </div>
            <span className="text-[10px] text-white/50">{shareLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
