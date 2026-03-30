import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { WorldMap } from './WorldMap';
import { ArtifactPoints } from './ArtifactPoints';
import { ArtifactCallout } from './ArtifactCallout';
import { useStore } from '../store';

export const Globe = () => {
  const groupRef = useRef<THREE.Group>(null);
  const { isRotating, viewMode, setPointerOverGlobe } = useStore();

  // Reset rotation when switching to flat mode
  React.useEffect(() => {
    if (viewMode === 'flat' && groupRef.current) {
      gsap.to(groupRef.current.rotation, {
        y: 0,
        duration: 1,
        ease: 'power2.inOut'
      });
    }
  }, [viewMode]);

  useFrame((state, delta) => {
    if (isRotating && groupRef.current && viewMode === 'sphere') {
      groupRef.current.rotation.y += delta * 0.15;
    }
  });

  return (
    <group ref={groupRef}>
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
