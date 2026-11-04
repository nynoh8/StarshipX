import React, { useRef, useImperativeHandle, forwardRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import { Part } from "../utils/spaceshipGenerator";
import { SpaceshipModel } from "./SpaceshipModel";

interface SpaceshipViewerProps {
  parts: Part[];
  onPartClick?: (partId?: string) => void;
  selectedPartId?: string;
}

export interface SpaceshipViewerRef {
}

export const SpaceshipViewer = forwardRef<
  SpaceshipViewerRef,
  SpaceshipViewerProps
>(({ parts, onPartClick, selectedPartId }, ref) => {
  const groupRef = useRef<THREE.Group>(null);

  useImperativeHandle(ref, () => ({
  }));

  return (
    <div className="absolute inset-0 bg-[#1e293b]">
      <Canvas 
        camera={{ position: [15, 10, 15], fov: 45 }} 
        shadows
        onPointerMissed={() => onPartClick && onPartClick(undefined)}
      >
        <color attach="background" args={["#1e293b"]} />
        <ambientLight intensity={0.8} color="#e0e5ff" />
        <directionalLight
          position={[10, 20, 10]}
          intensity={1.5}
          color="#fff5e6"
          castShadow
          shadow-mapSize={[2048, 2048]}
        />
        <pointLight position={[-10, -10, -10]} intensity={0.8} color="#dbeafe" />

        <SpaceshipModel ref={groupRef} parts={parts} onPartClick={onPartClick} selectedPartId={selectedPartId} />

        <ContactShadows
          position={[0, -5, 0]}
          opacity={0.4}
          scale={40}
          blur={2}
          far={10}
        />

        <OrbitControls
          makeDefault
          autoRotate
          autoRotateSpeed={0.5}
          enablePan={false}
          maxPolarAngle={Math.PI / 2 + 0.2}
          minDistance={5}
          maxDistance={50}
        />
        <React.Suspense fallback={null}>
          <Environment preset="city" />
        </React.Suspense>
      </Canvas>
    </div>
  );
});
