import React, { useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { useStore } from '../store';
import { SafeImage } from './SafeImage';

export const ArtifactOverlay = () => {
  const { sites, selectedSiteId, dismissedSiteId, dismissActiveCard } = useStore();
  const activeSiteId = selectedSiteId;

  const activeSite = useMemo(
    () => sites.find((site) => site.id === activeSiteId) ?? null,
    [sites, activeSiteId],
  );

  const isVisible = Boolean(activeSite && activeSite.id !== dismissedSiteId);

  return (
    <AnimatePresence mode="wait">
      {isVisible && activeSite && (
        <motion.aside
          key={activeSite.id}
          initial={{ opacity: 0, x: 28, y: -12 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: 28, y: -12 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="absolute right-4 top-4 z-20 w-[340px] max-h-[calc(100vh-32px)] overflow-hidden rounded-[28px] border border-white/30 bg-white/10 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.5),0_0_0_1px_rgba(249,115,22,0.1),0_0_24px_rgba(249,115,22,0.08)] backdrop-blur-2xl pointer-events-auto"
        >
          <div className="flex max-h-[calc(100vh-64px)] flex-col">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="mb-2 text-[10px] uppercase tracking-[0.28em] text-white/30">Highlighted Site</p>
                <h3 className="mb-1 text-2xl font-serif italic leading-tight text-orange-400">
                  {activeSite.name}
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-widest text-white/40">{activeSite.country}</span>
                  <span className="h-1 w-1 rounded-full bg-white/20" />
                  <span className="text-[10px] uppercase tracking-widest text-white/40">{activeSite.year}</span>
                </div>
              </div>
              <button
                onClick={dismissActiveCard}
                className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/45 transition-colors hover:text-white"
                aria-label="Close floating card"
              >
                <X size={15} />
              </button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/10">
              <SafeImage
                src={activeSite.image}
                alt={activeSite.name}
                className="aspect-video w-full object-cover"
                referrerPolicy="no-referrer"
                title={activeSite.name}
                subtitle={`${activeSite.country} · ${activeSite.year}`}
                category={activeSite.category}
                variant="card"
              />
            </div>

            <div className="custom-scrollbar mt-4 overflow-y-auto pr-1">
              <p className="text-sm leading-relaxed text-white/70">{activeSite.description}</p>
            </div>

              <div className="mt-4 flex items-center border-t border-white/10 pt-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-orange-400">
                  {activeSite.category}
                </span>
              </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};
