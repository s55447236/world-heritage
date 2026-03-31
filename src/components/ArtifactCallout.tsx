import React, { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { AnimatePresence, motion } from 'motion/react';
import * as THREE from 'three';
import { useStore } from '../store';

export const ArtifactCallout = () => {
  const { sites, hoveredSiteId, selectedSiteId, viewMode, setPointerOverGlobe } = useStore();
  const activeSiteId = hoveredSiteId ?? selectedSiteId;

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

  const line = useMemo(() => {
    if (!points) return null;
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: '#f97316',
      transparent: true,
      opacity: 0.65,
    });
    return new THREE.Line(geometry, material);
  }, [points]);

  if (!activeSite || !points || !line) return null;

  return (
    <group raycast={() => null}>
      <primitive object={line} raycast={() => null} />
      <Html position={points[1]} center distanceFactor={10} zIndexRange={[5, 0]}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSite.id}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            onPointerEnter={() => setPointerOverGlobe(true)}
            onPointerLeave={() => setPointerOverGlobe(false)}
            className="min-w-[220px] max-w-[320px] cursor-pointer select-none text-center"
          >
            <h3 className="text-[1rem] font-serif italic leading-tight text-orange-400 drop-shadow-[0_0_16px_rgba(249,115,22,0.2)]">
              {activeSite.name}
            </h3>
          </motion.div>
        </AnimatePresence>
      </Html>
    </group>
  );
};
