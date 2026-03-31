import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { WorldMap } from './WorldMap';
import { ArtifactPoints } from './ArtifactPoints';
import { ArtifactCallout } from './ArtifactCallout';
import { useStore } from '../store';

export const Globe = () => {
  const groupRef = useRef<THREE.Group>(null);
  const { isRotating, viewMode, setPointerOverGlobe } = useStore();

  React.useEffect(() => {
    if (!groupRef.current) return;
    groupRef.current.rotation.set(0, 0, 0);
  }, [viewMode]);

  useFrame((state, delta) => {
    if (isRotating && groupRef.current && viewMode === 'sphere') {
      groupRef.current.rotation.y += delta * 0.15;
    }
  });

  return (
    <group ref={groupRef} scale={0.8}>
      {viewMode === 'sphere' && (
        <mesh
          onPointerOver={() => setPointerOverGlobe(true)}
          onPointerMove={() => setPointerOverGlobe(true)}
          onPointerOut={() => setPointerOverGlobe(false)}
        >
          <sphereGeometry args={[5.3, 48, 48]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
      <WorldMap />
      <ArtifactPoints />
      <ArtifactCallout />
    </group>
  );
};
