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
const parentWorldScale = new THREE.Vector3();
const beamDirection = new THREE.Vector3();
const beamPosition = new THREE.Vector3();
const upAxis = new THREE.Vector3(0, 1, 0);
const beamQuaternion = new THREE.Quaternion();
const hoverRaycaster = new THREE.Raycaster();
const hiddenScale = new THREE.Vector3(0.0001, 0.0001, 0.0001);
const HOVER_PIXEL_RADIUS = 8;
const SPHERE_RADIUS = 5.02;
const ANGULAR_LOCK_THRESHOLD = 0.9992;

const getSiteColor = (category: 'Cultural' | 'Natural' | 'Mixed') => {
  if (category === 'Cultural') return CULTURAL_COLOR;
  if (category === 'Natural') return NATURAL_COLOR;
  return MIXED_COLOR;
};

export const ArtifactPoints = () => {
  const visibleMeshRef = useRef<THREE.InstancedMesh>(null);
  const beamMeshRef = useRef<THREE.InstancedMesh>(null);
  const positionsRef = useRef<THREE.Vector3[]>([]);
  const scalesRef = useRef<number[]>([]);
  const renderedScalesRef = useRef<number[]>([]);
  const pointerSelectedIdRef = useRef<string | null>(null);
  const pointerRef = useRef({ x: 0, y: 0, ndcX: 0, ndcY: 0, inside: false });
  const { camera, gl, size } = useThree();
  const {
    sites,
    viewMode,
    selectedSiteId,
    hoveredSiteId,
    showSites,
    setHoveredSiteId,
    setSelectedSiteId,
  } = useStore();

  const activeSiteId = selectedSiteId ?? hoveredSiteId;

  const targetPositions = useMemo(
    () => sites.map((site) => new THREE.Vector3(...(viewMode === 'sphere' ? site.coords : site.flatCoords))),
    [sites, viewMode],
  );

  const scales = useMemo(
    () =>
      sites.map((site) => {
        if (site.id === selectedSiteId || site.id === hoveredSiteId) return 1.65;
        return site.id.startsWith('random') ? 0.56 : 0.88;
      }),
    [sites, selectedSiteId, hoveredSiteId],
  );

  const syncMesh = (nextPositions: THREE.Vector3[], nextScales: number[]) => {
    if (!visibleMeshRef.current || !beamMeshRef.current) return;

    nextPositions.forEach((position, index) => {
      visibleObject.position.copy(position);
      visibleObject.scale.setScalar(nextScales[index]);
      visibleObject.quaternion.identity();
      visibleObject.updateMatrix();
      visibleMeshRef.current!.setMatrixAt(index, visibleObject.matrix);

      if (viewMode === 'sphere') {
        beamDirection.copy(position).normalize();
        beamQuaternion.setFromUnitVectors(upAxis, beamDirection);
        beamPosition.copy(position).addScaledVector(beamDirection, 0.16);
        visibleObject.position.copy(beamPosition);
        visibleObject.quaternion.copy(beamQuaternion);
        visibleObject.scale.set(nextScales[index] * 0.55, nextScales[index] * 0.82, nextScales[index] * 0.55);
      } else {
        visibleObject.position.copy(position);
        visibleObject.quaternion.identity();
        visibleObject.scale.copy(hiddenScale);
      }
      visibleMeshRef.current!.setColorAt(index, getSiteColor(sites[index].category));
      beamMeshRef.current!.setColorAt(index, getSiteColor(sites[index].category));
      visibleObject.updateMatrix();
      beamMeshRef.current!.setMatrixAt(index, visibleObject.matrix);
    });

    visibleMeshRef.current.instanceMatrix.needsUpdate = true;
    if (visibleMeshRef.current.instanceColor) {
      visibleMeshRef.current.instanceColor.needsUpdate = true;
    }
    beamMeshRef.current.instanceMatrix.needsUpdate = true;
    if (beamMeshRef.current.instanceColor) {
      beamMeshRef.current.instanceColor.needsUpdate = true;
    }
    visibleMeshRef.current.computeBoundingSphere();
    visibleMeshRef.current.computeBoundingBox();
    beamMeshRef.current.computeBoundingSphere();
    beamMeshRef.current.computeBoundingBox();
    renderedScalesRef.current = [...nextScales];
  };

  const syncSphereFacingMesh = () => {
    if (!visibleMeshRef.current || !beamMeshRef.current) return;

    let didChange = false;
    visibleMeshRef.current.parent?.localToWorld(globeCenter.set(0, 0, 0));
    cameraDirection.copy(camera.position).sub(globeCenter).normalize();

    positionsRef.current.forEach((position, index) => {
      worldPosition.copy(position);
      visibleMeshRef.current!.localToWorld(worldPosition);
      pointDirection.copy(worldPosition).sub(globeCenter).normalize();

      const nextScale = pointDirection.dot(cameraDirection) > 0 ? scalesRef.current[index] : 0;
      if (Math.abs((renderedScalesRef.current[index] ?? -1) - nextScale) < 0.0001) return;

      visibleObject.position.copy(position);
      if (nextScale > 0) {
        visibleObject.scale.setScalar(nextScale);
      } else {
        visibleObject.scale.copy(hiddenScale);
      }
      visibleObject.quaternion.identity();
      visibleObject.updateMatrix();
      visibleMeshRef.current!.setMatrixAt(index, visibleObject.matrix);

      if (nextScale > 0) {
        beamDirection.copy(position).normalize();
        beamQuaternion.setFromUnitVectors(upAxis, beamDirection);
        beamPosition.copy(position).addScaledVector(beamDirection, 0.16);
        visibleObject.position.copy(beamPosition);
        visibleObject.quaternion.copy(beamQuaternion);
        visibleObject.scale.set(nextScale * 0.55, nextScale * 0.82, nextScale * 0.55);
      } else {
        visibleObject.position.copy(position);
        visibleObject.quaternion.identity();
        visibleObject.scale.copy(hiddenScale);
      }
      visibleObject.updateMatrix();
      beamMeshRef.current!.setMatrixAt(index, visibleObject.matrix);

      renderedScalesRef.current[index] = nextScale;
      didChange = true;
    });

    if (didChange) {
      visibleMeshRef.current.instanceMatrix.needsUpdate = true;
      beamMeshRef.current.instanceMatrix.needsUpdate = true;
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
    positionsRef.current = targetPositions.map((position) => position.clone());
    syncMesh(positionsRef.current, scalesRef.current);
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
    if (!showSites) {
      pointerSelectedIdRef.current = null;
      setHoveredSiteId(null);
      setSelectedSiteId(null);
      document.body.style.cursor = '';
      return;
    }

    positionsRef.current = targetPositions.map((position) => position.clone());
    scalesRef.current = [...scales];
    syncMesh(positionsRef.current, scalesRef.current);
  }, [showSites, targetPositions, scales, setHoveredSiteId, setSelectedSiteId]);

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
      document.body.style.cursor = '';
    };

    const handlePointerLeave = () => {
      pointerRef.current.inside = false;
      setHoveredSiteId(null);
      document.body.style.cursor = '';
    };

    const handleClick = () => {
      if (pointerSelectedIdRef.current) {
        setSelectedSiteId(pointerSelectedIdRef.current);
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
  }, [gl, setHoveredSiteId, setSelectedSiteId]);

  useFrame(() => {
    if (!showSites) return;
    if (!visibleMeshRef.current) return;

    if (viewMode === 'sphere') {
      syncSphereFacingMesh();
    } else if (renderedScalesRef.current.length !== scalesRef.current.length) {
      syncMesh(positionsRef.current, scalesRef.current);
    }

    if (!pointerRef.current.inside) return;

    let closestSiteId: string | null = null;
    let closestDistance = Number.POSITIVE_INFINITY;
    let bestAngularScore = -1;

    pointerPosition.set(pointerRef.current.x, pointerRef.current.y);
    visibleMeshRef.current.parent?.localToWorld(globeCenter.set(0, 0, 0));
    cameraDirection.copy(camera.position).sub(globeCenter).normalize();

    if (viewMode === 'sphere') {
      hoverRaycaster.setFromCamera(
        pointerPosition.set(pointerRef.current.ndcX, pointerRef.current.ndcY),
        camera,
      );

      visibleMeshRef.current.parent?.getWorldScale(parentWorldScale);
      const worldSphereRadius = SPHERE_RADIUS * Math.max(parentWorldScale.x, parentWorldScale.y, parentWorldScale.z);

      const hit = hoverRaycaster.ray.intersectSphere(
        new THREE.Sphere(globeCenter, worldSphereRadius),
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
          if (angularScore > bestAngularScore) {
            bestAngularScore = angularScore;
            closestSiteId = sites[index].id;
          }
        });

        if (bestAngularScore < ANGULAR_LOCK_THRESHOLD) {
          closestSiteId = null;
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

        if (distance < HOVER_PIXEL_RADIUS && distance < closestDistance) {
          closestDistance = distance;
          closestSiteId = sites[index].id;
        }
      });
    }

    pointerSelectedIdRef.current = closestSiteId;

    if (closestSiteId !== hoveredSiteId) {
      setHoveredSiteId(closestSiteId);
    }

    document.body.style.cursor = closestSiteId ? 'pointer' : '';
  });

  return (
    <>
      <instancedMesh ref={beamMeshRef} args={[undefined, undefined, sites.length]} visible={showSites} frustumCulled={false}>
        <coneGeometry args={[0.05, 0.28, 8, 1, true]} />
        <meshBasicMaterial
          transparent
          opacity={0.12}
          depthTest={false}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </instancedMesh>
      <instancedMesh
        ref={visibleMeshRef}
        args={[undefined, undefined, sites.length]}
        visible={showSites}
        frustumCulled={false}
      >
        <sphereGeometry args={[0.035, 10, 10]} />
        <meshBasicMaterial
          transparent
          opacity={0.92}
          depthTest={false}
          depthWrite={false}
          blending={THREE.NormalBlending}
          toneMapped={false}
        />
      </instancedMesh>
    </>
  );
};
