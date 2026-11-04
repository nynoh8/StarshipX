import React, { useRef, useState, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import { generateSpaceship, Part } from "../utils/spaceshipGenerator";
import { SpaceshipModel } from "./SpaceshipModel";

const explosionGeometry = new THREE.SphereGeometry(1, 32, 32);

export function Explosion({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame((_, delta) => {
    if (ref.current && materialRef.current) {
      ref.current.scale.addScalar(delta * 20);
      materialRef.current.opacity -= delta * 1.5;
    }
  });

  return (
    <mesh position={position} ref={ref} geometry={explosionGeometry}>
      <meshBasicMaterial ref={materialRef} color="#ff5500" transparent opacity={1} />
    </mesh>
  );
}

export function RemotePlayer({
  id,
  activeSeed,
  customParts,
  name,
  remoteData,
}: {
  id: string;
  activeSeed: string;
  customParts?: Part[];
  name: string;
  remoteData: React.MutableRefObject<Record<string, any>>;
}) {
  const ref = useRef<THREE.Group>(null);
  const [health, setHealth] = useState(100);
  const [isDead, setIsDead] = useState(false);
  const [explosionPos, setExplosionPos] = useState<[number, number, number] | null>(null);
  const parts = useMemo(() => {
    if (customParts && customParts.length > 0) {
      return customParts;
    }
    return generateSpaceship(activeSeed);
  }, [activeSeed, customParts]);

  useFrame(() => {
    const data = remoteData.current[id];
    if (data && data.position && data.quaternion) {
      if (data.health !== health) setHealth(data.health);
      
      if (data.isDead && !isDead) {
        setIsDead(true);
        setExplosionPos(data.position);
      } else if (!data.isDead && isDead) {
        setIsDead(false);
        setExplosionPos(null);
      }

      if (ref.current && !data.isDead) {
        ref.current.position.lerp(
          new THREE.Vector3().fromArray(data.position),
          0.3,
        );
        ref.current.quaternion.slerp(
          new THREE.Quaternion().fromArray(data.quaternion),
          0.3,
        );
      }
    }
  });

  return (
    <group ref={ref} renderOrder={10}>
      <group visible={!isDead}>
        <SpaceshipModel parts={parts} />
        
        {/* Long-range glowing plasma beacon visible across the galaxy */}
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[3.5, 16, 16]} />
          <meshBasicMaterial
            color="#38bdf8"
            transparent
            opacity={0.4}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        {/* Top light for visibility */}
        <pointLight
          position={[0, 8, 0]}
          intensity={4}
          color="#38bdf8"
          distance={60}
        />
        {/* Name tag balloon */}
        <Html position={[0, 8, 0]} center distanceFactor={20} pointerEvents="none">
          <div className="bg-black/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/20 shadow-xl whitespace-nowrap flex items-center gap-2">
            <span className="text-emerald-400 font-bold text-xs uppercase tracking-wider">{name}</span>
            <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 transition-all duration-300" 
                style={{ width: `${health}%` }}
              />
            </div>
          </div>
          {/* Balloon tail */}
          <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-black/80 mx-auto mt-[-1px]" />
        </Html>
      </group>
      {isDead && explosionPos && <Explosion position={explosionPos} />}
    </group>
  );
}
