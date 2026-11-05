import React, { useRef, useState, useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, Html } from "@react-three/drei";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { planetPositions } from "../game/state";

export interface SolarMediaConfig {
  mediaType?: "youtube" | "image" | "none";
  mediaUrl?: string;
  roomName?: string;
  planetTextures?: Record<string, string>;
}

export function getAssetUrl(path: string): string {
  const base = (import.meta as any).env?.BASE_URL || "./";
  const cleanBase = base.endsWith("/") ? base : `${base}/`;
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `${cleanBase}${cleanPath}`;
}

export function convertGoogleDriveUrl(url?: string): string {
  if (!url) return "";
  const match = url.match(/(?:file\/d\/|id=|open\?id=)([a-zA-Z0-9_-]{25,})/);
  if (match && match[1]) {
    return `https://lh3.googleusercontent.com/d/${match[1]}`;
  }
  return url;
}

// Global GLTF loader and cache to avoid re-parsing models and reduce memory overhead
const gltfLoader = new GLTFLoader();
const modelCache = new Map<string, THREE.Group>();

function loadOptimizedGLB(
  url: string,
  targetSize: number,
  onLoaded: (scene: THREE.Group) => void
) {
  if (modelCache.has(url)) {
    onLoaded(modelCache.get(url)!);
    return;
  }

  gltfLoader.load(
    url,
    (gltf) => {
      const scene = gltf.scene;

      // Auto-center geometry
      const box = new THREE.Box3().setFromObject(scene);
      const centerVec = new THREE.Vector3();
      box.getCenter(centerVec);
      scene.position.sub(centerVec);

      // Scale to target visual radius
      const sphere = new THREE.Sphere();
      box.getBoundingSphere(sphere);
      if (sphere.radius > 0) {
        const scaleFactor = (targetSize * 2) / sphere.radius;
        scene.scale.setScalar(scaleFactor);
      }

      // Performance optimization on all meshes
      scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.frustumCulled = true;
          mesh.castShadow = false;
          mesh.receiveShadow = false;
        }
      });

      modelCache.set(url, scene);
      onLoaded(scene);
    },
    undefined,
    () => {
      // Silently ignore if not found
    }
  );
}

// Reusable vector to eliminate per-frame Garbage Collection spikes
const _sharedWorldPos = new THREE.Vector3();

const SOLAR_SYSTEM_DATA = [
  {
    name: "Sun",
    size: 400,
    distance: 0,
    color: "#ffcc00",
    emissive: "#ffaa00",
    isSun: true,
    modelName: "sol.glb",
  },
  { name: "Mercury", size: 8, distance: 800, color: "#888888", modelName: "mercurio.glb" },
  { name: "Venus", size: 18, distance: 1100, color: "#e3bb76", modelName: "venus.glb" },
  {
    name: "Earth",
    size: 20,
    distance: 1500,
    color: "#2b82c9",
    modelName: "terra.glb",
    hasMoon: true,
    hasSatellite: true,
  },
  { name: "Mars", size: 12, distance: 1900, color: "#c1440e", modelName: "marte.glb" },
  { name: "Jupiter", size: 180, distance: 2800, color: "#d39c7e", modelName: "jupiter.glb" },
  {
    name: "Saturn",
    size: 150,
    distance: 3800,
    color: "#ead6b8",
    hasRings: true,
    modelName: "saturno.glb",
  },
  { name: "Uranus", size: 70, distance: 4800, color: "#4b70dd", modelName: "urano.glb" },
  { name: "Neptune", size: 68, distance: 5500, color: "#274687", modelName: "netuno.glb" },
  { name: "Pluto", size: 10, distance: 6200, color: "#9ca3af", modelName: "plutao.glb" },
];

function SunBody({
  data,
  roomMedia,
}: {
  data: any;
  roomMedia?: SolarMediaConfig;
}) {
  const meshRef = useRef<THREE.Group>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [sunModel, setSunModel] = useState<THREE.Group | null>(null);

  useEffect(() => {
    // 1. Load cached 3D GLB model for Sun
    loadOptimizedGLB(getAssetUrl("models/planets/sol.glb"), data.size, (scene) => {
      setSunModel(scene);
    });

    // 2. Custom texture if image media configured
    if (roomMedia?.mediaType === "image" && roomMedia.mediaUrl) {
      const finalUrl = convertGoogleDriveUrl(roomMedia.mediaUrl);
      const texLoader = new THREE.TextureLoader();
      texLoader.load(
        finalUrl,
        (loadedTex) => {
          loadedTex.wrapS = THREE.RepeatWrapping;
          loadedTex.wrapT = THREE.ClampToEdgeWrapping;
          loadedTex.needsUpdate = true;
          setTexture(loadedTex);
        },
        undefined,
        () => setTexture(null)
      );
    }
  }, [data.size, roomMedia?.mediaType, roomMedia?.mediaUrl]);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.15;
      meshRef.current.getWorldPosition(_sharedWorldPos);
      planetPositions.set(data.name, { position: _sharedWorldPos.clone(), radius: data.size });
    }
  });

  return (
    <group position={[0, 0, data.distance]}>
      {/* 3D Sun Core */}
      {roomMedia?.mediaType === "youtube" ? (
        <mesh>
          <sphereGeometry args={[data.size * 0.98, 32, 32]} />
          <meshBasicMaterial colorWrite={false} depthWrite={true} />
        </mesh>
      ) : sunModel ? (
        <group ref={meshRef}>
          <primitive object={sunModel.clone()} />
        </group>
      ) : (
        <mesh ref={meshRef as any}>
          <sphereGeometry args={[data.size, 32, 32]} />
          {roomMedia?.mediaType === "image" && texture ? (
            <meshStandardMaterial
              map={texture}
              emissive="#ffaa00"
              emissiveIntensity={0.8}
              roughness={0.3}
            />
          ) : (
            <meshBasicMaterial color={data.color} />
          )}
        </mesh>
      )}

      {/* Atmospheric Photosphere Glow only if NOT rendering GLB model (prevents double overdraw) */}
      {!sunModel && (
        <mesh scale={1.03}>
          <sphereGeometry args={[data.size, 24, 24]} />
          <meshBasicMaterial
            color={data.emissive || "#ffaa00"}
            transparent
            opacity={0.3}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}

      {/* YouTube Video Projection (if active in room) */}
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
  const meshRef = useRef<THREE.Group>(null);
  const moonRef = useRef<THREE.Group>(null);
  const satRef = useRef<THREE.Group>(null);

  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [ringTexture, setRingTexture] = useState<THREE.Texture | null>(null);
  const [gltfScene, setGltfScene] = useState<THREE.Group | null>(null);
  const [moonScene, setMoonScene] = useState<THREE.Group | null>(null);
  const [satScene, setSatScene] = useState<THREE.Group | null>(null);

  const [angle] = useState(Math.random() * Math.PI * 2);
  const orbitSpeed = data.distance > 0 ? 20 / data.distance : 0;

  useEffect(() => {
    if (data.isSun) return;
    const planetKey = data.name.toLowerCase();
    const modelFile = data.modelName || `${planetKey}.glb`;

    // 1. Try loading cached 3D GLB model
    loadOptimizedGLB(getAssetUrl(`models/planets/${modelFile}`), data.size, (scene) => {
      setGltfScene(scene);
    });

    // 2. Try loading Moon GLB (around Earth)
    if (data.hasMoon) {
      loadOptimizedGLB(getAssetUrl("models/planets/lua.glb"), 4.5, (scene) => {
        setMoonScene(scene);
      });
    }

    // 3. Try loading Satellite GLB (around Earth)
    if (data.hasSatellite) {
      loadOptimizedGLB(getAssetUrl("models/planets/satelite.glb"), 2.2, (scene) => {
        setSatScene(scene);
      });
    }

    // 4. Try loading texture fallback only if custom textures specified
    const customUrl = roomMedia?.planetTextures?.[planetKey];
    if (customUrl) {
      const texLoader = new THREE.TextureLoader();
      texLoader.load(
        convertGoogleDriveUrl(customUrl),
        (loadedTex) => {
          loadedTex.colorSpace = THREE.SRGBColorSpace;
          setTexture(loadedTex);
        },
        undefined,
        () => setTexture(null)
      );
    }

    if (data.hasRings && !gltfScene) {
      const ringCustomUrl = roomMedia?.planetTextures?.["saturn_ring"];
      if (ringCustomUrl) {
        const texLoader = new THREE.TextureLoader();
        texLoader.load(
          convertGoogleDriveUrl(ringCustomUrl),
          (loadedRing) => {
            loadedRing.colorSpace = THREE.SRGBColorSpace;
            setRingTexture(loadedRing);
          },
          undefined,
          () => setRingTexture(null)
        );
      }
    }
  }, [data.name, data.size, data.isSun, data.hasRings, data.hasMoon, data.hasSatellite, data.modelName, gltfScene, roomMedia?.planetTextures]);

  useFrame((_, delta) => {
    if (ref.current && data.distance > 0) {
      ref.current.rotation.y += orbitSpeed * delta * 0.1;
    }
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.2;
      meshRef.current.getWorldPosition(_sharedWorldPos);
      planetPositions.set(data.name, { position: _sharedWorldPos.clone(), radius: data.size });
    }
    if (moonRef.current) {
      moonRef.current.rotation.y += delta * 0.75;
    }
    if (satRef.current) {
      satRef.current.rotation.y += delta * 1.6;
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
          {gltfScene ? (
            <group ref={meshRef}>
              <primitive object={gltfScene.clone()} />
            </group>
          ) : (
            <mesh ref={meshRef as any}>
              <sphereGeometry args={[data.size, 32, 32]} />
              <meshStandardMaterial
                color={texture ? "#ffffff" : data.color}
                map={texture || undefined}
                roughness={0.7}
                metalness={0.1}
              />
            </mesh>
          )}

          {/* Earth Sub-Orbits: Moon and Satellite */}
          {data.hasMoon && (
            <group ref={moonRef}>
              <group position={[data.size * 2.4, 0, 0]}>
                {moonScene ? (
                  <primitive object={moonScene.clone()} />
                ) : (
                  <mesh>
                    <sphereGeometry args={[4, 16, 16]} />
                    <meshStandardMaterial color="#cccccc" roughness={0.9} />
                  </mesh>
                )}
              </group>
            </group>
          )}

          {data.hasSatellite && (
            <group ref={satRef}>
              <group position={[data.size * 1.5, data.size * 0.4, 0]}>
                {satScene && <primitive object={satScene.clone()} />}
              </group>
            </group>
          )}

          {/* Saturn Ring Overlay only if using standard sphere fallback */}
          {!gltfScene && data.hasRings && (
            <mesh rotation={[Math.PI / 2.2, 0, 0]}>
              <ringGeometry args={[data.size * 1.2, data.size * 2.2, 32]} />
              <meshStandardMaterial
                color={ringTexture ? "#ffffff" : data.color}
                map={ringTexture || undefined}
                transparent
                opacity={0.85}
                side={THREE.DoubleSide}
              />
            </mesh>
          )}
        </group>
      </group>
    </group>
  );
}

// Optimized Asteroid Field with a clean set of 8 distributed landmarks
function AsteroidBelt({ center }: { center: [number, number, number] }) {
  const [asteroidScene, setAsteroidScene] = useState<THREE.Group | null>(null);
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    loadOptimizedGLB(getAssetUrl("models/planets/asteroide.glb"), 14, (scene) => {
      setAsteroidScene(scene);
    });
  }, []);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.02;
    }
  });

  const asteroidInstances = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + (i % 2 === 0 ? 0.1 : -0.1);
      const dist = 2350 + (i % 3) * 60;
      const y = ((i % 4) - 2) * 25;
      const scale = 0.8 + (i % 3) * 0.4;
      arr.push({
        pos: [Math.cos(angle) * dist, y, Math.sin(angle) * dist] as [number, number, number],
        scale,
      });
    }
    return arr;
  }, []);

  if (!asteroidScene) return null;

  return (
    <group ref={groupRef} position={center}>
      {asteroidInstances.map((item, idx) => (
        <group key={idx} position={item.pos} scale={item.scale}>
          <primitive object={asteroidScene.clone()} />
        </group>
      ))}
    </group>
  );
}

// Optimized Comet with emissive glow instead of expensive dynamic lights
function CometBody({ center }: { center: [number, number, number] }) {
  const cometRef = useRef<THREE.Group>(null);
  const [cometScene, setCometScene] = useState<THREE.Group | null>(null);
  const angleRef = useRef(0);

  useEffect(() => {
    loadOptimizedGLB(getAssetUrl("models/planets/cometa.glb"), 18, (scene) => {
      setCometScene(scene);
    });
  }, []);

  useFrame((_, delta) => {
    angleRef.current += delta * 0.05;
    if (cometRef.current) {
      const a = 4600;
      const b = 2100;
      const x = Math.cos(angleRef.current) * a;
      const z = Math.sin(angleRef.current) * b + center[2];
      const y = Math.sin(angleRef.current * 1.4) * 450;
      cometRef.current.position.set(x, y, z);
      cometRef.current.rotation.y += delta * 0.4;
    }
  });

  if (!cometScene) return null;

  return (
    <group ref={cometRef}>
      <primitive object={cometScene.clone()} />
    </group>
  );
}

export function SolarSystem({ roomMedia }: { roomMedia?: SolarMediaConfig }) {
  const center: [number, number, number] = [0, 0, -3000];

  return (
    <>
      <pointLight
        position={center}
        intensity={5}
        distance={40000}
        decay={1}
        color="#fff5e6"
      />
      <ambientLight intensity={0.9} color="#e0e5ff" />
      <directionalLight position={[1000, 2000, 1000]} intensity={1.0} color="#ffffff" />

      {SOLAR_SYSTEM_DATA.map((body) => (
        <CelestialBody key={body.name} data={body} center={center} roomMedia={roomMedia} />
      ))}
      <AsteroidBelt center={center} />
      <CometBody center={center} />
    </>
  );
}
