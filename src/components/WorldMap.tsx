import React, { useMemo, useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import * as d3 from 'd3-geo';
import { useFrame } from '@react-three/fiber';
import gsap from 'gsap';
import { useStore } from '../store';

// Helper to convert Lat/Lon to 3D Sphere coordinates
const latLonToSphere = (lat: number, lon: number, radius: number): [number, number, number] => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  return [x, y, z];
};

// Helper to convert Lat/Lon to Flat map coordinates
const latLonToFlat = (lat: number, lon: number, zOffset: number = 0): [number, number, number] => {
  const x = (lon / 180) * 10;
  const y = (lat / 90) * 5;
  return [x, y, zOffset];
};

export const WorldMap = () => {
  const [geoData, setGeoData] = useState<any>(null);
  const { viewMode } = useStore();
  const groupRef = useRef<THREE.Group>(null);

  // Textures for Land and Ocean
  const [landTexture, setLandTexture] = useState<THREE.CanvasTexture | null>(null);

  // Fetch GeoJSON and Create Texture
  useEffect(() => {
    fetch('https://raw.githubusercontent.com/datasets/geo-boundaries-world-110m/master/countries.geojson')
      .then(res => res.json())
      .then(data => {
        setGeoData(data);
        
        // Create a canvas to draw the land mask
        const canvas = document.createElement('canvas');
        canvas.width = 2048;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          // 1. Draw Ocean (Optional: if we want a separate mask, but here we'll use a base sphere)
          // 2. Draw Land
          ctx.fillStyle = '#ffffff';
          const projection = d3.geoEquirectangular().scale(canvas.width / (2 * Math.PI)).translate([canvas.width / 2, canvas.height / 2]);
          const path = d3.geoPath(projection, ctx);
          
          ctx.beginPath();
          path(data);
          ctx.fill();
          
          const tex = new THREE.CanvasTexture(canvas);
          setLandTexture(tex);
        }
      });
  }, []);

  const borders = useMemo(() => {
    if (!geoData) return [];
    
    const allLines: { sphere: THREE.Vector3[], flat: THREE.Vector3[] }[] = [];
    
    geoData.features.forEach((feature: any) => {
      const coordinates = feature.geometry.type === 'Polygon' 
        ? [feature.geometry.coordinates] 
        : feature.geometry.coordinates;

      coordinates.forEach((polygon: any) => {
        polygon.forEach((ring: any) => {
          const spherePoints: THREE.Vector3[] = [];
          const flatPoints: THREE.Vector3[] = [];
          
          ring.forEach(([lon, lat]: [number, number]) => {
            const s = latLonToSphere(lat, lon, 5.01); // Slightly above land
            const f = latLonToFlat(lat, lon, 0.01); 
            spherePoints.push(new THREE.Vector3(...s));
            flatPoints.push(new THREE.Vector3(...f));
          });
          
          allLines.push({ sphere: spherePoints, flat: flatPoints });
        });
      });
    });
    
    return allLines;
  }, [geoData]);

  return (
    <group ref={groupRef} visible={viewMode === 'sphere'}>
      {/* Ocean Layer - Only visible where land is NOT */}
      <mesh raycast={() => null}>
        <sphereGeometry args={[4.8, 64, 64]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.07} />
      </mesh>

      {/* Land Layer - Precise fill from texture */}
      {landTexture && (
        <mesh raycast={() => null}>
          <sphereGeometry args={[4.9, 64, 64]} />
          <meshBasicMaterial 
            map={landTexture} 
            transparent 
            opacity={0.16} 
            color="#ffffff"
            alphaTest={0.01}
          />
        </mesh>
      )}

      {/* Country Borders */}
      {borders.map((line, i) => (
        <BorderLine key={i} spherePoints={line.sphere} flatPoints={line.flat} viewMode={viewMode} />
      ))}
    </group>
  );
};

const BorderLine = ({ spherePoints, flatPoints, viewMode }: { spherePoints: THREE.Vector3[], flatPoints: THREE.Vector3[], viewMode: string }) => {
  const lineRef = useRef<THREE.Line>(null);
  
  useEffect(() => {
    if (!lineRef.current) return;
    
    const targetPoints = viewMode === 'sphere' ? spherePoints : flatPoints;
    const geometry = lineRef.current.geometry;
    
    // Animate points
    const currentPoints = geometry.attributes.position.array as Float32Array;
    const targetArr = new Float32Array(targetPoints.length * 3);
    targetPoints.forEach((p, i) => {
      targetArr[i * 3] = p.x;
      targetArr[i * 3 + 1] = p.y;
      targetArr[i * 3 + 2] = p.z;
    });

    const obj = { t: 0 };
    const startArr = [...currentPoints];
    
    gsap.to(obj, {
      t: 1,
      duration: 1.5,
      ease: 'expo.inOut',
      onUpdate: () => {
        for (let i = 0; i < startArr.length; i++) {
          currentPoints[i] = startArr[i] + (targetArr[i] - startArr[i]) * obj.t;
        }
        geometry.attributes.position.needsUpdate = true;
      }
    });
  }, [viewMode, spherePoints, flatPoints]);

  const initialPoints = useMemo(() => {
    const pts = viewMode === 'sphere' ? spherePoints : flatPoints;
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, []);

  const line = useMemo(
    () =>
      new THREE.Line(
        initialPoints,
        new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.46 }),
      ),
    [initialPoints],
  );

  return (
    <primitive object={line} ref={lineRef} raycast={() => null} />
  );
};
