import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { useStore } from '../store';

const CULTURAL_COLOR = new THREE.Color('#ff8c00');
const NATURAL_COLOR = new THREE.Color('#4ade80');
const MIXED_COLOR = new THREE.Color('#60a5fa');
const visibleObject = new THREE.Object3D();
const worldPosition = new THREE.Vector3();
const projectedPosition = new THREE.Vector3();
const pointerPosition = new THREE.Vector2();
const globeCenter = new THREE.Vector3();
const cameraDirection = new THREE.Vector3();
const pointDirection = new THREE.Vector3();
const surfaceDirection = new THREE.Vector3();
const rayHitPoint = new THREE.Vector3();
const hoverRaycaster = new THREE.Raycaster();
const HOVER_PIXEL_RADIUS = 26;
const HOVER_PIXEL_SWITCH_BIAS = 1.5;
const SPHERE_RADIUS = 5.2;
const ANGULAR_LOCK_THRESHOLD = 0.992;
const ANGULAR_SWITCH_BIAS = 0.0015;

const getSiteColor = (category: 'Cultural' | 'Natural' | 'Mixed') => {
  if (category === 'Cultural') return CULTURAL_COLOR;
  if (category === 'Natural') return NATURAL_COLOR;
  return MIXED_COLOR;
};

export const ArtifactPoints = () => {
  const visibleMeshRef = useRef<THREE.InstancedMesh>(null);
  const positionsRef = useRef<THREE.Vector3[]>([]);
  const scalesRef = useRef<number[]>([]);
  const pointerRef = useRef({ x: 0, y: 0, ndcX: 0, ndcY: 0, inside: false });
  const { camera, gl, size } = useThree();
  const {
    sites,
    viewMode,
    selectedSiteId,
    hoveredSiteId,
    setHoveredSiteId,
    setSelectedSiteId,
  } = useStore();

  const activeSiteId = hoveredSiteId ?? selectedSiteId;

  const targetPositions = useMemo(
    () => sites.map((site) => new THREE.Vector3(...(viewMode === 'sphere' ? site.coords : site.flatCoords))),
    [sites, viewMode],
  );

  const scales = useMemo(
    () =>
      sites.map((site) => {
        if (site.id === activeSiteId) return 1.9;
        return site.id.startsWith('random') ? 0.7 : 1.15;
      }),
    [sites, activeSiteId],
  );

  const syncMesh = (nextPositions: THREE.Vector3[], nextScales: number[]) => {
    if (!visibleMeshRef.current) return;

    nextPositions.forEach((position, index) => {
      visibleObject.position.copy(position);
      visibleObject.scale.setScalar(nextScales[index]);
      visibleObject.updateMatrix();
      visibleMeshRef.current!.setMatrixAt(index, visibleObject.matrix);
      visibleMeshRef.current!.setColorAt(index, getSiteColor(sites[index].category));
    });

    visibleMeshRef.current.instanceMatrix.needsUpdate = true;
    if (visibleMeshRef.current.instanceColor) {
      visibleMeshRef.current.instanceColor.needsUpdate = true;
    }
  };

  useEffect(() => {
    positionsRef.current = sites.map(
      (site) => new THREE.Vector3(...(viewMode === 'sphere' ? site.coords : site.flatCoords)),
    );
    scalesRef.current = [...scales];
    syncMesh(positionsRef.current, scalesRef.current);
  }, [sites]);

  useEffect(() => {
    const tweenState = { t: 0 };
    const fromPositions = positionsRef.current.map((position) => position.clone());
    const toPositions = targetPositions.map((position) => position.clone());

    const animation = gsap.to(tweenState, {
      t: 1,
      duration: 1.2,
      ease: 'expo.inOut',
      onUpdate: () => {
        const nextPositions = fromPositions.map((start, index) => start.clone().lerp(toPositions[index], tweenState.t));
        positionsRef.current = nextPositions;
        syncMesh(nextPositions, scalesRef.current);
      },
      onComplete: () => {
        positionsRef.current = toPositions;
        syncMesh(positionsRef.current, scalesRef.current);
      },
    });

    return () => {
      animation.kill();
    };
  }, [targetPositions]);

  useEffect(() => {
    const fromScales = [...scalesRef.current];
    const toScales = [...scales];
    const tweenState = { t: 0 };

    const animation = gsap.to(tweenState, {
      t: 1,
      duration: 0.28,
      ease: 'power3.out',
      onUpdate: () => {
        const nextScales = fromScales.map((start, index) => start + (toScales[index] - start) * tweenState.t);
        scalesRef.current = nextScales;
        syncMesh(positionsRef.current, nextScales);
      },
      onComplete: () => {
        scalesRef.current = toScales;
        syncMesh(positionsRef.current, toScales);
      },
    });

    return () => {
      animation.kill();
    };
  }, [scales]);

  useEffect(() => {
    const dom = gl.domElement;

    const handlePointerMove = (event: PointerEvent) => {
      const rect = dom.getBoundingClientRect();
      pointerRef.current = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        ndcX: ((event.clientX - rect.left) / rect.width) * 2 - 1,
        ndcY: -((event.clientY - rect.top) / rect.height) * 2 + 1,
        inside: true,
      };
      document.body.style.cursor = 'pointer';
    };

    const handlePointerLeave = () => {
      pointerRef.current.inside = false;
      setHoveredSiteId(null);
      document.body.style.cursor = '';
    };

    const handleClick = () => {
      if (hoveredSiteId) {
        setSelectedSiteId(hoveredSiteId);
      }
    };

    dom.addEventListener('pointermove', handlePointerMove);
    dom.addEventListener('pointerleave', handlePointerLeave);
    dom.addEventListener('click', handleClick);

    return () => {
      dom.removeEventListener('pointermove', handlePointerMove);
      dom.removeEventListener('pointerleave', handlePointerLeave);
      dom.removeEventListener('click', handleClick);
      document.body.style.cursor = '';
    };
  }, [gl, hoveredSiteId, setHoveredSiteId, setSelectedSiteId]);

  useFrame(() => {
    if (!pointerRef.current.inside || !visibleMeshRef.current) return;

    let closestSiteId: string | null = null;
    let closestDistance = Number.POSITIVE_INFINITY;
    let bestAngularScore = -1;
    let currentHoverAngularScore = -1;
    let currentHoverPixelDistance = Number.POSITIVE_INFINITY;

    pointerPosition.set(pointerRef.current.x, pointerRef.current.y);
    visibleMeshRef.current.parent?.localToWorld(globeCenter.set(0, 0, 0));
    cameraDirection.copy(camera.position).sub(globeCenter).normalize();

    if (viewMode === 'sphere') {
      hoverRaycaster.setFromCamera(
        pointerPosition.set(pointerRef.current.ndcX, pointerRef.current.ndcY),
        camera,
      );

      const hit = hoverRaycaster.ray.intersectSphere(
        new THREE.Sphere(globeCenter, SPHERE_RADIUS),
        rayHitPoint,
      );

      if (hit) {
        surfaceDirection.copy(rayHitPoint).sub(globeCenter).normalize();

        positionsRef.current.forEach((position, index) => {
          worldPosition.copy(position);
          visibleMeshRef.current!.localToWorld(worldPosition);

          pointDirection.copy(worldPosition).sub(globeCenter).normalize();
          const facingScore = pointDirection.dot(cameraDirection);
          if (facingScore <= 0) return;

          const angularScore = pointDirection.dot(surfaceDirection);
          if (sites[index].id === hoveredSiteId) {
            currentHoverAngularScore = angularScore;
          }

          if (angularScore > bestAngularScore) {
            bestAngularScore = angularScore;
            closestSiteId = sites[index].id;
          }
        });

        if (bestAngularScore < ANGULAR_LOCK_THRESHOLD) {
          closestSiteId = null;
        } else if (
          hoveredSiteId &&
          closestSiteId &&
          closestSiteId !== hoveredSiteId &&
          currentHoverAngularScore >= bestAngularScore - ANGULAR_SWITCH_BIAS
        ) {
          closestSiteId = hoveredSiteId;
        }
      }
    } else {
      positionsRef.current.forEach((position, index) => {
        worldPosition.copy(position);
        visibleMeshRef.current!.localToWorld(worldPosition);

        projectedPosition.copy(worldPosition).project(camera);

        const screenX = (projectedPosition.x * 0.5 + 0.5) * size.width;
        const screenY = (-projectedPosition.y * 0.5 + 0.5) * size.height;
        const distance = pointerPosition.distanceTo(new THREE.Vector2(screenX, screenY));

        if (sites[index].id === hoveredSiteId) {
          currentHoverPixelDistance = distance;
        }

        if (distance < HOVER_PIXEL_RADIUS && distance < closestDistance) {
          closestDistance = distance;
          closestSiteId = sites[index].id;
        }
      });

      if (
        hoveredSiteId &&
        closestSiteId &&
        closestSiteId !== hoveredSiteId &&
        currentHoverPixelDistance <= closestDistance + HOVER_PIXEL_SWITCH_BIAS
      ) {
        closestSiteId = hoveredSiteId;
      }
    }

    if (closestSiteId !== hoveredSiteId) {
      setHoveredSiteId(closestSiteId);
      document.body.style.cursor = closestSiteId ? 'pointer' : '';
    }
  });

  return (
    <instancedMesh ref={visibleMeshRef} args={[undefined, undefined, sites.length]}>
      <sphereGeometry args={[0.045, 10, 10]} />
      <meshBasicMaterial transparent opacity={0.9} blending={THREE.AdditiveBlending} toneMapped={false} />
    </instancedMesh>
  );
};
