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
    // 1. Try loading 3D GLB model for Sun
    const loader = new GLTFLoader();
    loader.load(
      getAssetUrl("models/planets/sol.glb"),
      (gltf) => {
        const scene = gltf.scene;
        const box = new THREE.Box3().setFromObject(scene);
        const centerVec = new THREE.Vector3();
        box.getCenter(centerVec);
        scene.position.sub(centerVec);

        const sphere = new THREE.Sphere();
        box.getBoundingSphere(sphere);
        if (sphere.radius > 0) {
          const scaleFactor = (data.size * 2) / sphere.radius;
          scene.scale.setScalar(scaleFactor);
        }
        setSunModel(scene);
      },
      undefined,
      () => setSunModel(null)
    );

    // 2. Try loading custom texture
    const rawUrl = roomMedia?.mediaType === "image" && roomMedia.mediaUrl ? roomMedia.mediaUrl : null;
    const finalUrl = rawUrl ? convertGoogleDriveUrl(rawUrl) : getAssetUrl("textures/planets/sun.jpg");

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
      () => {
        if (!rawUrl) setTexture(null);
      }
    );
  }, [data.size, roomMedia?.mediaType, roomMedia?.mediaUrl]);

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
      {/* 3D Sun Core */}
      {roomMedia?.mediaType === "youtube" ? (
        <mesh>
          <sphereGeometry args={[data.size * 0.98, 48, 48]} />
          <meshBasicMaterial colorWrite={false} depthWrite={true} />
        </mesh>
      ) : sunModel ? (
        <group ref={meshRef}>
          <primitive object={sunModel.clone()} />
        </group>
      ) : (
        <mesh ref={meshRef as any}>
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

      {/* YouTube Video Projection (if active) */}
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

    // 1. Try loading 3D GLB model
    const glbLoader = new GLTFLoader();
    glbLoader.load(
      getAssetUrl(`models/planets/${modelFile}`),
      (gltf) => {
        const scene = gltf.scene;
        const box = new THREE.Box3().setFromObject(scene);
        const centerVec = new THREE.Vector3();
        box.getCenter(centerVec);
        scene.position.sub(centerVec);

        const sphere = new THREE.Sphere();
        box.getBoundingSphere(sphere);
        if (sphere.radius > 0) {
          const scaleFactor = (data.size * 2) / sphere.radius;
          scene.scale.setScalar(scaleFactor);
        }
        setGltfScene(scene);
      },
      undefined,
      () => setGltfScene(null)
    );

    // 2. Try loading Moon GLB (around Earth)
    if (data.hasMoon) {
      glbLoader.load(
        getAssetUrl("models/planets/lua.glb"),
        (gltf) => {
          const scene = gltf.scene;
          const box = new THREE.Box3().setFromObject(scene);
          const sphere = new THREE.Sphere();
          box.getBoundingSphere(sphere);
          if (sphere.radius > 0) {
            scene.scale.setScalar(5.5 / sphere.radius);
          }
          setMoonScene(scene);
        },
        undefined,
        () => setMoonScene(null)
      );
    }

    // 3. Try loading Satellite GLB (around Earth)
    if (data.hasSatellite) {
      glbLoader.load(
        getAssetUrl("models/planets/satelite.glb"),
        (gltf) => {
          const scene = gltf.scene;
          const box = new THREE.Box3().setFromObject(scene);
          const sphere = new THREE.Sphere();
          box.getBoundingSphere(sphere);
          if (sphere.radius > 0) {
            scene.scale.setScalar(2.5 / sphere.radius);
          }
          setSatScene(scene);
        },
        undefined,
        () => setSatScene(null)
      );
    }

    // 4. Try loading texture fallback
    const customUrl = roomMedia?.planetTextures?.[planetKey];
    const targetUrl = customUrl
      ? convertGoogleDriveUrl(customUrl)
      : getAssetUrl(`textures/planets/${planetKey}.jpg`);

    const texLoader = new THREE.TextureLoader();
    texLoader.load(
      targetUrl,
      (loadedTex) => {
        loadedTex.wrapS = THREE.RepeatWrapping;
        loadedTex.wrapT = THREE.ClampToEdgeWrapping;
        loadedTex.colorSpace = THREE.SRGBColorSpace;
        setTexture(loadedTex);
      },
      undefined,
      () => setTexture(null)
    );

    if (data.hasRings) {
      const ringCustomUrl = roomMedia?.planetTextures?.["saturn_ring"];
      const ringUrl = ringCustomUrl
        ? convertGoogleDriveUrl(ringCustomUrl)
        : getAssetUrl("textures/planets/saturn_ring.png");

      texLoader.load(
        ringUrl,
        (loadedRing) => {
          loadedRing.colorSpace = THREE.SRGBColorSpace;
          setRingTexture(loadedRing);
        },
        undefined,
        () => setRingTexture(null)
      );
    }
  }, [data.name, data.size, data.isSun, data.hasRings, data.hasMoon, data.hasSatellite, data.modelName, roomMedia?.planetTextures]);

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
              <sphereGeometry args={[data.size, 64, 64]} />
              <meshStandardMaterial
                color={texture ? "#ffffff" : data.color}
                map={texture || undefined}
                roughness={texture ? 0.8 : 0.7}
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
                    <sphereGeometry args={[4.5, 16, 16]} />
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

          {/* Atmospheric Glow */}
          <mesh scale={1.05}>
            <sphereGeometry args={[data.size, 32, 32]} />
            <meshBasicMaterial
              color={data.emissive || data.color}
              transparent
              opacity={0.1}
              side={THREE.BackSide}
            />
          </mesh>

          {/* Saturn Ring Overlay if using sphere fallback */}
          {!gltfScene && data.hasRings && (
            <mesh rotation={[Math.PI / 2.2, 0, 0]}>
              <ringGeometry args={[data.size * 1.2, data.size * 2.2, 64]} />
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

function AsteroidBelt({ center }: { center: [number, number, number] }) {
  const [asteroidScene, setAsteroidScene] = useState<THREE.Group | null>(null);
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    const loader = new GLTFLoader();
    loader.load(
      getAssetUrl("models/planets/asteroide.glb"),
      (gltf) => {
        const scene = gltf.scene;
        const box = new THREE.Box3().setFromObject(scene);
        const sphere = new THREE.Sphere();
        box.getBoundingSphere(sphere);
        if (sphere.radius > 0) {
          scene.scale.setScalar(12 / sphere.radius);
        }
        setAsteroidScene(scene);
      },
      undefined,
      () => setAsteroidScene(null)
    );
  }, []);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.02;
    }
  });

  const asteroidInstances = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 42; i++) {
      const angle = (i / 42) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
      const dist = 2350 + (Math.random() - 0.5) * 180;
      const y = (Math.random() - 0.5) * 70;
      const scale = 0.5 + Math.random() * 1.4;
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

function CometBody({ center }: { center: [number, number, number] }) {
  const cometRef = useRef<THREE.Group>(null);
  const [cometScene, setCometScene] = useState<THREE.Group | null>(null);
  const angleRef = useRef(0);

  useEffect(() => {
    const loader = new GLTFLoader();
    loader.load(
      getAssetUrl("models/planets/cometa.glb"),
      (gltf) => {
        const scene = gltf.scene;
        const box = new THREE.Box3().setFromObject(scene);
        const sphere = new THREE.Sphere();
        box.getBoundingSphere(sphere);
        if (sphere.radius > 0) {
          scene.scale.setScalar(18 / sphere.radius);
        }
        setCometScene(scene);
      },
      undefined,
      () => setCometScene(null)
    );
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
      <pointLight color="#7dd3fc" intensity={3} distance={400} />
    </group>
  );
}

export function SolarSystem({ roomMedia }: { roomMedia?: SolarMediaConfig }) {
  const center: [number, number, number] = [0, 0, -3000];
  const [fullSystemScene, setFullSystemScene] = useState<THREE.Group | null>(null);

  useEffect(() => {
    const loader = new GLTFLoader();
    loader.load(
      getAssetUrl("models/solar_system.glb"),
      (gltf) => {
        setFullSystemScene(gltf.scene);
      },
      undefined,
      () => {
        setFullSystemScene(null);
      }
    );
  }, []);

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

      {fullSystemScene ? (
        <group position={center}>
          <primitive object={fullSystemScene.clone()} />
        </group>
      ) : (
        <>
          {SOLAR_SYSTEM_DATA.map((body) => (
            <CelestialBody key={body.name} data={body} center={center} roomMedia={roomMedia} />
          ))}
          <AsteroidBelt center={center} />
          <CometBody center={center} />
        </>
      )}
    </>
  );
}
