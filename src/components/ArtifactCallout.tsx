import React, { useMemo } from 'react';
import { Html, Line } from '@react-three/drei';
import { AnimatePresence, motion } from 'motion/react';
import * as THREE from 'three';
import { useStore } from '../store';

const CalloutItem = ({
  id,
  name,
  coords,
  flatCoords,
  viewMode,
  color,
  opacity,
  fontSizeClass,
  textShadow,
}: {
  id: string;
  name: string;
  coords: [number, number, number];
  flatCoords: [number, number, number];
  viewMode: 'sphere' | 'flat';
  color: string;
  opacity: number;
  fontSizeClass: string;
  textShadow: string;
}) => {
  const points = useMemo(() => {
    const start = new THREE.Vector3(...(viewMode === 'sphere' ? coords : flatCoords));
    const end = start.clone().multiplyScalar(1.26);
    return [start, end];
  }, [coords, flatCoords, viewMode]);

  return (
    <group raycast={() => null}>
      <Line points={points} color={color} lineWidth={1.8} transparent opacity={opacity} raycast={() => null} />
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
            key={id}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            className="pointer-events-none min-w-[220px] max-w-[320px] select-none text-center"
          >
            <h3
              className={`${fontSizeClass} font-serif italic leading-tight`}
              style={{
                color,
                textShadow,
              }}
            >
              {name}
            </h3>
          </motion.div>
        </AnimatePresence>
      </Html>
    </group>
  );
};

export const ArtifactCallout = () => {
  const { sites, selectedSiteId, hoveredSiteId, dismissedSiteId, viewMode, showLabels, showSites } = useStore();
  const selectedSite = useMemo(
    () =>
      selectedSiteId && selectedSiteId !== dismissedSiteId
        ? sites.find((site) => site.id === selectedSiteId) ?? null
        : null,
    [sites, selectedSiteId, dismissedSiteId],
  );
  const hoveredSite = useMemo(
    () =>
      hoveredSiteId && hoveredSiteId !== dismissedSiteId && hoveredSiteId !== selectedSiteId
        ? sites.find((site) => site.id === hoveredSiteId) ?? null
        : null,
    [sites, hoveredSiteId, dismissedSiteId, selectedSiteId],
  );

  if (!showSites || !showLabels || (!selectedSite && !hoveredSite)) return null;

  return (
    <>
      {selectedSite && (
        <CalloutItem
          id={selectedSite.id}
          name={selectedSite.name}
          coords={selectedSite.coords}
          flatCoords={selectedSite.flatCoords}
          viewMode={viewMode}
          color="#ffffff"
          opacity={0.9}
          fontSizeClass="text-[0.92rem]"
          textShadow="0 0 16px rgba(255,255,255,0.22)"
        />
      )}
      {hoveredSite && (
        <CalloutItem
          id={hoveredSite.id}
          name={hoveredSite.name}
          coords={hoveredSite.coords}
          flatCoords={hoveredSite.flatCoords}
          viewMode={viewMode}
          color="rgba(255,255,255,0.72)"
          opacity={0.34}
          fontSizeClass="text-[0.78rem]"
          textShadow="0 0 10px rgba(255,255,255,0.1)"
        />
      )}
    </>
  );
};
