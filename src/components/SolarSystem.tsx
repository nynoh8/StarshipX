import React, { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, Html } from "@react-three/drei";
import * as THREE from "three";
import { planetPositions } from "../game/state";

export interface SolarMediaConfig {
  mediaType?: "youtube" | "image" | "none";
  mediaUrl?: string;
  roomName?: string;
}

const SOLAR_SYSTEM_DATA = [
  {
    name: "Sun",
    size: 400,
    distance: 0,
    color: "#ffcc00",
    emissive: "#ffaa00",
    isSun: true,
  },
  { name: "Mercury", size: 8, distance: 800, color: "#888888" },
  { name: "Venus", size: 18, distance: 1100, color: "#e3bb76" },
  { name: "Earth", size: 20, distance: 1500, color: "#2b82c9" },
  { name: "Mars", size: 12, distance: 1900, color: "#c1440e" },
  { name: "Jupiter", size: 180, distance: 2800, color: "#d39c7e" },
  {
    name: "Saturn",
    size: 150,
    distance: 3800,
    color: "#ead6b8",
    hasRings: true,
  },
  { name: "Uranus", size: 70, distance: 4800, color: "#4b70dd" },
  { name: "Neptune", size: 68, distance: 5500, color: "#274687" },
];

function SunBody({
  data,
  roomMedia,
}: {
  data: any;
  roomMedia?: SolarMediaConfig;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (roomMedia?.mediaType === "image" && roomMedia.mediaUrl) {
      const loader = new THREE.TextureLoader();
      loader.load(
        roomMedia.mediaUrl,
        (loadedTex) => {
          loadedTex.wrapS = THREE.RepeatWrapping;
          loadedTex.wrapT = THREE.ClampToEdgeWrapping;
          loadedTex.needsUpdate = true;
          setTexture(loadedTex);
        },
        undefined,
        (err) => console.warn("Failed to load custom solar texture:", err)
      );
    } else {
      setTexture(null);
    }
  }, [roomMedia?.mediaType, roomMedia?.mediaUrl]);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.15;
      const worldPos = new THREE.Vector3();
      meshRef.current.getWorldPosition(worldPos);
      planetPositions.set(data.name, { position: worldPos, radius: data.size });
    }
  });

  return (
    <group position={[0, 0, data.distance]}>
      {/* 3D Sun Sphere (The core celestial body) */}
      {roomMedia?.mediaType === "youtube" ? (
        // When YouTube video is projected: write depth for occlusion when ships fly behind,
        // without colorWrite blocking the canvas cutout
        <mesh ref={meshRef}>
          <sphereGeometry args={[data.size * 0.98, 48, 48]} />
          <meshBasicMaterial colorWrite={false} depthWrite={true} />
        </mesh>
      ) : (
        <mesh ref={meshRef}>
          <sphereGeometry args={[data.size, 64, 64]} />
          {roomMedia?.mediaType === "image" && texture ? (
            <meshStandardMaterial
              map={texture}
              emissive="#ffaa00"
              emissiveMap={texture}
              emissiveIntensity={0.8}
              roughness={0.3}
              metalness={0.1}
            />
          ) : (
            <meshBasicMaterial color={data.color} />
          )}
        </mesh>
      )}

      {/* Atmospheric Solar Photosphere Glow */}
      <mesh scale={1.02}>
        <sphereGeometry args={[data.size, 48, 48]} />
        <meshBasicMaterial
          color={data.emissive || "#ffaa00"}
          transparent
          opacity={roomMedia?.mediaType === "youtube" ? 0.15 : 0.35}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Outer Corona & Solar Flares Layer */}
      <mesh scale={1.07}>
        <sphereGeometry args={[data.size, 32, 32]} />
        <meshBasicMaterial
          color="#ff6600"
          transparent
          opacity={0.18}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* When YouTube video is projected: fuse directly into Sun's spherical surface (no borders, no separate card look) */}
      {roomMedia?.mediaType === "youtube" && roomMedia.mediaUrl && (
        <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
          <Html
            center
            transform
            occlude="blending"
            zIndexRange={[100, 0]}
            distanceFactor={950}
            style={{
              width: "780px",
              height: "780px",
              borderRadius: "50%",
              overflow: "hidden",
              border: "none",
              outline: "none",
              // Seamless radial edge feathering so video blends into the 3D glowing solar plasma
              WebkitMaskImage: "radial-gradient(circle at 50% 50%, rgba(0,0,0,1) 58%, rgba(0,0,0,0.85) 75%, rgba(0,0,0,0.35) 90%, transparent 100%)",
              maskImage: "radial-gradient(circle at 50% 50%, rgba(0,0,0,1) 58%, rgba(0,0,0,0.85) 75%, rgba(0,0,0,0.35) 90%, transparent 100%)",
              pointerEvents: "none",
              backgroundColor: "transparent",
            }}
          >
            <iframe
              id="solar-youtube-iframe"
              src={
                roomMedia.mediaUrl.includes("enablejsapi=1")
                  ? roomMedia.mediaUrl
                  : `${roomMedia.mediaUrl}${roomMedia.mediaUrl.includes("?") ? "&" : "?"}enablejsapi=1`
              }
              style={{
                width: "100%",
                height: "100%",
                border: "none",
                objectFit: "cover",
                transform: "scale(1.35)",
                pointerEvents: "none",
                filter: "contrast(1.08) brightness(1.05)",
              }}
              allow="autoplay; encrypted-media"
              title="Sun Solar Texture"
            />
          </Html>

          {/* 3D Spherical Solar Atmosphere Ring Overlay */}
          <mesh scale={1.01}>
            <ringGeometry args={[data.size * 0.85, data.size * 1.05, 64]} />
            <meshBasicMaterial
              color="#ffaa00"
              transparent
              opacity={0.4}
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </Billboard>
      )}
    </group>
  );
}

function CelestialBody({
  data,
  center,
  roomMedia,
}: {
  data: any;
  center: [number, number, number];
  roomMedia?: SolarMediaConfig;
}) {
  const ref = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  const [angle] = useState(Math.random() * Math.PI * 2);
  const orbitSpeed = data.distance > 0 ? 20 / data.distance : 0;

  useFrame((_, delta) => {
    if (ref.current && data.distance > 0) {
      ref.current.rotation.y += orbitSpeed * delta * 0.1;
    }
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.2;
      const worldPos = new THREE.Vector3();
      meshRef.current.getWorldPosition(worldPos);
      planetPositions.set(data.name, { position: worldPos, radius: data.size });
    }
  });

  if (data.isSun) {
    return (
      <group position={center} ref={ref}>
        <SunBody data={data} roomMedia={roomMedia} />
      </group>
    );
  }

  return (
    <group position={center} ref={ref}>
      <group rotation={[0, angle, 0]}>
        <group position={[0, 0, data.distance]}>
          <mesh ref={meshRef}>
            <sphereGeometry args={[data.size, 64, 64]} />
            <meshStandardMaterial
              color={data.color}
              roughness={0.7}
              metalness={0.1}
            />
          </mesh>

          <mesh scale={1.05}>
            <sphereGeometry args={[data.size, 32, 32]} />
            <meshBasicMaterial
              color={data.emissive || data.color}
              transparent
              opacity={0.1}
              side={THREE.BackSide}
            />
          </mesh>

          {data.hasRings && (
            <mesh rotation={[Math.PI / 2.2, 0, 0]}>
              <ringGeometry args={[data.size * 1.2, data.size * 2.2, 64]} />
              <meshStandardMaterial
                color={data.color}
                transparent
                opacity={0.8}
                side={THREE.DoubleSide}
              />
            </mesh>
          )}
        </group>
      </group>
    </group>
  );
}

export function SolarSystem({ roomMedia }: { roomMedia?: SolarMediaConfig }) {
  const center: [number, number, number] = [0, 0, -3000];

  return (
    <>
      <pointLight
        position={center}
        intensity={6}
        distance={50000}
        decay={1}
        color="#fff5e6"
      />
      <ambientLight intensity={0.8} color="#e0e5ff" />
      <directionalLight position={[1000, 2000, 1000]} intensity={1.2} color="#ffffff" />
      <hemisphereLight args={["#ffffff", "#444455", 0.6]} />

      {SOLAR_SYSTEM_DATA.map((body) => (
        <CelestialBody key={body.name} data={body} center={center} roomMedia={roomMedia} />
      ))}
    </>
  );
}
