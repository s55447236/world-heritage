import React, { useMemo } from 'react';
import { Html, Line } from '@react-three/drei';
import { AnimatePresence, motion } from 'motion/react';
import * as THREE from 'three';
import { useStore } from '../store';

export const ArtifactCallout = () => {
  const { sites, selectedSiteId, viewMode, showLabels, showSites } = useStore();
  const activeSiteId = selectedSiteId;

  const activeSite = useMemo(
    () => sites.find((site) => site.id === activeSiteId) ?? null,
    [sites, activeSiteId],
  );

  const points = useMemo(() => {
    if (!activeSite) return null;
    const start = new THREE.Vector3(...(viewMode === 'sphere' ? activeSite.coords : activeSite.flatCoords));
    const end = start.clone().multiplyScalar(1.26);
    return [start, end];
  }, [activeSite, viewMode]);

  if (!showSites || !showLabels || !activeSite || !points) return null;

  return (
    <group raycast={() => null}>
      <Line
        points={points}
        color="#ffffff"
        lineWidth={1.8}
        transparent
        opacity={0.78}
        raycast={() => null}
      />
      <Html
        position={points[1]}
        center
        distanceFactor={10}
        zIndexRange={[5, 0]}
        wrapperClass="artifact-callout-layer"
        pointerEvents="none"
        style={{ pointerEvents: 'none' }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSite.id}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            className="pointer-events-none min-w-[220px] max-w-[320px] select-none text-center"
          >
            <h3 className="text-[1rem] font-serif italic leading-tight text-white drop-shadow-[0_0_16px_rgba(255,255,255,0.22)]">
              {activeSite.name}
            </h3>
          </motion.div>
        </AnimatePresence>
      </Html>
    </group>
  );
};
