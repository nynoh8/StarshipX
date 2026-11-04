import React, { useRef, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  Stars,
  KeyboardControls
} from "@react-three/drei";
import { generateSpaceship, Part } from "../utils/spaceshipGenerator";
import { getShipStats } from "../utils/shipStats";
import { io, Socket } from "socket.io-client";
import { MobileControls } from "./MobileControls";
import { Player } from "./Player";
import { RemotePlayer, Explosion } from "./RemotePlayer";
import { BulletsManager } from "./BulletsManager";
import { SolarSystem } from "./SolarSystem";
import { Radar, RadarLogic } from "./Radar";
import { GameUI } from "./GameUI";
import { isWebGLSupported, WebGLErrorBoundary, WebGLResilienceHandler } from "../hooks/useWebGLResilience";
import { Language } from "../utils/translations";
import { generateSolarSpawnPoint } from "../utils/solarSpawn";
import { Rocket, Loader2, Wifi } from "lucide-react";
import { p2pMesh, P2PPacket, P2PStatus } from "../utils/p2pMesh";

function SpaceDust({ targetRef }: { targetRef: React.MutableRefObject<any> }) {
  const count = 400;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useRef(new THREE.Object3D());
  const particles = useRef<{ pos: THREE.Vector3 }[]>([]);

  useEffect(() => {
    particles.current = Array.from({ length: count }, () => ({
      pos: new THREE.Vector3(
        (Math.random() - 0.5) * 500,
        (Math.random() - 0.5) * 500,
        (Math.random() - 0.5) * 500 - 2800
      ),
    }));
  }, []);

  useFrame(() => {
    if (!meshRef.current || particles.current.length === 0) return;
    const center = targetRef.current?.position || [0, 0, -2800];
    const cX = center[0];
    const cY = center[1];
    const cZ = center[2];

    particles.current.forEach((p, i) => {
      if (p.pos.x - cX > 250) p.pos.x -= 500;
      if (p.pos.x - cX < -250) p.pos.x += 500;
      if (p.pos.y - cY > 250) p.pos.y -= 500;
      if (p.pos.y - cY < -250) p.pos.y += 500;
      if (p.pos.z - cZ > 250) p.pos.z -= 500;
      if (p.pos.z - cZ < -250) p.pos.z += 500;

      dummy.current.position.copy(p.pos);
      dummy.current.scale.setScalar(0.4);
      dummy.current.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.current.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial
        color="#38bdf8"
        transparent
        opacity={0.35}
        blending={THREE.AdditiveBlending}
      />
    </instancedMesh>
  );
}

export function Game({
  initialSeed,
  customParts,
  playerName,
  onExit,
  mode,
  user,
  lang = "en",
  roomId = "global",
  roomData,
}: {
  initialSeed: string;
  customParts?: Part[];
  playerName: string;
  onExit: () => void;
  mode: "training" | "multiplayer";
  user?: any;
  lang?: Language;
  roomId?: string;
  roomData?: any;
}) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [players, setPlayers] = useState<any[]>([]);
  const [health, setHealth] = useState(100);
  const [isDead, setIsDead] = useState(false);
  const [showUI, setShowUI] = useState(true);
  const [explosionPos, setExplosionPos] = useState<[number, number, number] | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [joinError, setJoinError] = useState("");
  const [localParts, setLocalParts] = useState<Part[]>([]);
  const [matchTime, setMatchTime] = useState(120);
  const [matchResults, setMatchResults] = useState<any[] | null>(null);
  const [eliminatedReason, setEliminatedReason] = useState<string | null>(null);
  const [respawnCountdown, setRespawnCountdown] = useState<number | null>(null);
  const [p2pStatus, setP2pStatus] = useState<P2PStatus>("disconnected");
  const [directPeerCount, setDirectPeerCount] = useState(0);
  const [roomMedia, setRoomMedia] = useState<{
    mediaType?: "youtube" | "image" | "none";
    mediaUrl?: string;
    roomName?: string;
    duration?: number;
    deathMode?: "respawn" | "elimination";
    maxPlayers?: number;
  }>({
    mediaType: roomData?.mediaType || "none",
    mediaUrl: roomData?.mediaUrl || "",
    roomName: roomData?.name || "",
    duration: roomData?.duration ?? 300,
    deathMode: roomData?.deathMode || "respawn",
    maxPlayers: roomData?.maxPlayers ?? 12,
  });

  const remoteData = useRef<Record<string, any>>({});
  const initialSpawn = useRef(generateSolarSpawnPoint());
  const localData = useRef<any>({
    position: initialSpawn.current.position,
    quaternion: initialSpawn.current.quaternion,
  });

  useEffect(() => {
    if (customParts && customParts.length > 0) {
      setLocalParts(customParts);
    } else {
      setLocalParts(generateSpaceship(initialSeed));
    }
  }, [initialSeed, customParts]);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on("connect", () => {
      // Initialize P2P WebRTC mesh with peers in the room
      p2pMesh.init(
        newSocket,
        newSocket.id,
        (peerId: string, packet: P2PPacket) => {
          if (packet.type === "move" && packet.payload) {
            if (remoteData.current[peerId]) {
              remoteData.current[peerId].position = packet.payload.position;
              remoteData.current[peerId].quaternion = packet.payload.quaternion;
            }
          }
        },
        (status, count) => {
          setP2pStatus(status);
          setDirectPeerCount(count);
        }
      );

      newSocket.emit("join", {
        name: playerName,
        seed: initialSeed,
        customParts: customParts,
        position: initialSpawn.current.position,
        quaternion: initialSpawn.current.quaternion,
        mode: mode,
        dbId: user?.dbId,
        roomId: roomId,
        roomPassword: roomData?.enteredPassword || roomData?.password,
      });
    });

    newSocket.on("room:info", (info: any) => {
      if (info) {
        setRoomMedia({
          mediaType: info.mediaType,
          mediaUrl: info.mediaUrl,
          roomName: info.name,
          duration: info.duration,
          deathMode: info.deathMode,
          maxPlayers: info.maxPlayers,
        });
      }
    });

    newSocket.on("join_error", (msg) => {
      setJoinError(msg);
    });

    // Fallback for static hosts (e.g. GitHub Pages without local socket server)
    const staticFallbackTimer = setTimeout(() => {
      setIsRevealed(true);
      const fallbackStats = getShipStats(initialSeed);
      setStats(fallbackStats);
      setHealth(fallbackStats.maxHealth);
      localData.current.stats = fallbackStats;
      localData.current.activeSeed = initialSeed;

      if (mode === "training" || players.length === 0) {
        const droneSeed = "DRONE_A";
        const droneStats = getShipStats(droneSeed);
        const spawn = generateSolarSpawnPoint();
        const fallbackNpc = {
          id: "npc-0",
          name: "Drone-Treino",
          activeSeed: droneSeed,
          stats: droneStats,
          position: spawn.position,
          quaternion: spawn.quaternion,
          health: droneStats.maxHealth * 0.5,
          isDead: false,
          isNPC: true
        };
        setPlayers([fallbackNpc]);
        remoteData.current["npc-0"] = fallbackNpc;
      }
    }, 2500);

    newSocket.on("join_success", (player) => {
      clearTimeout(staticFallbackTimer);
      setHealth(player.health);
      setStats(player.stats);
      localData.current.stats = player.stats;
      localData.current.activeSeed = player.activeSeed;
      if (player.position) {
        localData.current.position = player.position;
      }
      if (player.quaternion) {
        localData.current.quaternion = player.quaternion;
      }
      setTimeout(() => {
        setIsRevealed(true);
      }, 1200);
    });

    newSocket.on("leaderboard:update", (lb) => {
      setLeaderboard(lb);
    });

    newSocket.on("match:timer", (time) => {
      setMatchTime(time);
    });

    newSocket.on("match:end", (results) => {
      setMatchResults(results);
    });

    newSocket.on("match:start", () => {
      setMatchResults(null);
      setEliminatedReason(null);
      setRespawnCountdown(null);
    });

    newSocket.on("init", (serverPlayers: any[]) => {
      const me = serverPlayers.find((p) => p.id === newSocket.id);
      if (me) {
        setIsDead(me.isDead);
        setHealth(me.health);
        setExplosionPos(null);
        localData.current.position = me.position;
        localData.current.quaternion = me.quaternion;
        localData.current.activeSeed = me.activeSeed;
        if (me.customParts && me.customParts.length > 0) {
          setLocalParts(me.customParts);
        } else {
          setLocalParts(generateSpaceship(me.activeSeed));
        }
      }
      const others = serverPlayers.filter((p) => p.id !== newSocket.id);
      setPlayers(others);
      others.forEach((p) => {
        remoteData.current[p.id] = {
          position: p.position,
          quaternion: p.quaternion,
          health: p.health,
          isDead: p.isDead,
          activeSeed: p.activeSeed,
          customParts: p.customParts,
          name: p.name,
          isNPC: p.isNPC
        };
      });
    });

    newSocket.on("player:join", (player: any) => {
      setPlayers((prev) => {
        if (prev.some(p => p.id === player.id)) {
          return prev.map(p => p.id === player.id ? player : p);
        }
        return [...prev, player];
      });
      remoteData.current[player.id] = {
        position: player.position,
        quaternion: player.quaternion,
        health: player.health,
        isDead: false,
        activeSeed: player.activeSeed,
        customParts: player.customParts,
        name: player.name,
        isNPC: player.isNPC
      };
    });

    newSocket.on("player:move", (data: any) => {
      if (remoteData.current[data.id]) {
        remoteData.current[data.id].position = data.position;
        remoteData.current[data.id].quaternion = data.quaternion;
      }
    });

    newSocket.on("player:health", (data: any) => {
      if (data.id === newSocket.id) {
        setHealth(data.health);
      } else if (remoteData.current[data.id]) {
        remoteData.current[data.id].health = data.health;
      }
    });

    newSocket.on("player:die", (data: any) => {
      if (data.id === newSocket.id) {
        setIsDead(true);
        setExplosionPos(localData.current.position);
      } else if (remoteData.current[data.id]) {
        remoteData.current[data.id].isDead = true;
      }
    });

    newSocket.on("player:respawning", (data: { countdown: number }) => {
      setRespawnCountdown(data.countdown || 3);
    });

    newSocket.on("player:respawn_self", (data: any) => {
      setIsDead(false);
      setRespawnCountdown(null);
      setHealth(data.health);
      setExplosionPos(null);
      if (data.position) localData.current.position = data.position;
      if (data.quaternion) localData.current.quaternion = data.quaternion;
    });

    newSocket.on("training:failed", () => {
      setEliminatedReason("Your ship was destroyed.");
      setTimeout(() => {
        onExit();
      }, 2000);
    });

    newSocket.on("match:eliminated", (reason: string) => {
      setEliminatedReason(reason);
      setRespawnCountdown(null);
    });

    newSocket.on("player:respawn", (data: any) => {
      if (data.id === newSocket.id) {
        setIsDead(false);
        setRespawnCountdown(null);
        setHealth(data.health);
        setExplosionPos(null);
        localData.current.position = data.position;
        if (data.quaternion) localData.current.quaternion = data.quaternion;
        if (data.activeSeed) localData.current.activeSeed = data.activeSeed;
        if (data.stats) {
          localData.current.stats = data.stats;
          setStats(data.stats);
        }
      } else if (remoteData.current[data.id]) {
        remoteData.current[data.id].isDead = false;
        remoteData.current[data.id].health = data.health;
        remoteData.current[data.id].position = data.position;
        remoteData.current[data.id].quaternion = data.quaternion;
        if (data.activeSeed) remoteData.current[data.id].activeSeed = data.activeSeed;
        setPlayers((prev) => prev.map(p => p.id === data.id ? { ...p, isDead: false, activeSeed: data.activeSeed } : p));
      }
    });

    newSocket.on("player:leave", (id: string) => {
      setPlayers((prev) => prev.filter((p) => p.id !== id));
      delete remoteData.current[id];
    });

    return () => {
      p2pMesh.destroy();
      newSocket.disconnect();
    };
  }, []);

  if (joinError) {
    return (
      <div className="absolute inset-0 bg-black flex flex-col items-center justify-center text-white font-mono gap-4">
        <div className="text-red-500 text-xl font-bold">{joinError}</div>
        <button
          onClick={onExit}
          className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur-md transition-all font-medium border border-white/10"
        >
          Return to Hangar
        </button>
      </div>
    );
  }

  if (!isWebGLSupported()) {
    return (
      <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center p-6 text-center z-50">
        <h2 className="text-2xl font-bold text-red-400 mb-4">WebGL não suportado</h2>
        <p className="text-white max-w-md">Seu navegador ou dispositivo não suporta WebGL, que é necessário para renderizar os gráficos 3D do jogo.</p>
        <button onClick={onExit} className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium">Voltar ao Hangar</button>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-[#080c16] overflow-hidden font-sans">
      {socket && (
        <KeyboardControls
          map={[
            { name: "pitchUp", keys: ["s", "S", "ArrowDown"] },
            { name: "pitchDown", keys: ["w", "W", "ArrowUp"] },
            { name: "yawLeft", keys: ["a", "A", "ArrowLeft"] },
            { name: "yawRight", keys: ["d", "D", "ArrowRight"] },
            { name: "rollLeft", keys: ["q", "Q"] },
            { name: "rollRight", keys: ["e", "E"] },
            { name: "thrust", keys: ["Shift"] },
            { name: "brake", keys: ["Control"] },
            { name: "shoot", keys: ["Space"] },
            { name: "missile", keys: ["f", "F"] },
          ]}
        >
          <WebGLErrorBoundary>
            <Canvas shadows camera={{ fov: 60, far: 40000 }} dpr={[1, 2]} gl={{ alpha: true, antialias: false, powerPreference: "high-performance" }}>
              <WebGLResilienceHandler socket={socket} />

              {/* Enhanced Cosmic Lighting */}
              <ambientLight intensity={0.35} />
              <directionalLight
                position={[0, 0, 0]}
                intensity={2.2}
                color="#fffbeb"
              />
              <hemisphereLight
                args={["#38bdf8", "#0a0f1d", 0.45]}
              />

              {/* Deep Distant Star Galaxy Layer */}
              <Stars
                radius={2600}
                depth={300}
                count={8000}
                factor={6}
                saturation={0.5}
                fade
                speed={0.3}
              />

              {/* Medium Twinkling Star Clusters */}
              <Stars
                radius={600}
                depth={80}
                count={2000}
                factor={4}
                saturation={0.9}
                fade
                speed={1.2}
              />

              {/* High-Speed Cosmic Warp Dust */}
              <SpaceDust targetRef={localData} />

              <Player
                parts={localParts}
                socket={socket}
                localData={localData}
                remoteData={remoteData}
                health={health}
                isDead={isDead}
                stats={stats}
                playerName={playerName}
              />
              {isDead && explosionPos && <Explosion position={explosionPos} />}
              {players.map((p) => (
                <RemotePlayer
                  key={p.id}
                  id={p.id}
                  activeSeed={p.activeSeed}
                  customParts={p.customParts}
                  name={p.name}
                  remoteData={remoteData}
                />
              ))}
              <BulletsManager socket={socket} />

              <SolarSystem roomMedia={roomMedia} />
              <RadarLogic
                players={players}
                remoteData={remoteData}
                localData={localData}
              />
            </Canvas>
          </WebGLErrorBoundary>
        </KeyboardControls>
      )}

      {/* Active Battle Room Holographic Badge */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 pointer-events-none">
        {roomMedia?.roomName && (
          <div className="flex items-center gap-2.5 px-4 py-2 bg-black/70 backdrop-blur-md rounded-full border border-amber-500/40 text-xs font-semibold text-white shadow-lg shadow-amber-950/40">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            <span className="text-amber-300 font-bold tracking-wide">{roomMedia.roomName}</span>
            {roomMedia.mediaType === "youtube" && (
              <span className="text-[10px] px-2 py-0.5 bg-red-500/25 text-red-300 rounded-full font-mono border border-red-500/40">
                Vídeo no Sol
              </span>
            )}
            {roomMedia.mediaType === "image" && (
              <span className="text-[10px] px-2 py-0.5 bg-cyan-500/25 text-cyan-300 rounded-full font-mono border border-cyan-500/40">
                Foto no Sol
              </span>
            )}
          </div>
        )}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/70 backdrop-blur-md rounded-full border border-emerald-500/30 text-xs font-semibold text-white shadow-lg">
          <Wifi className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-emerald-300 font-mono text-[11px]">
            {directPeerCount > 0 ? `P2P WebRTC (${directPeerCount} peers)` : "P2P Ativo"}
          </span>
        </div>
      </div>

      {socket && stats && (
        <>
          <GameUI
            showUI={showUI}
            setShowUI={setShowUI}
            playersCount={players.length + 1}
            health={health}
            isDead={isDead}
            leaderboard={leaderboard}
            socketId={socket.id}
            onExit={onExit}
            matchTime={matchTime}
            matchResults={matchResults}
            mode={mode}
            eliminatedReason={eliminatedReason}
            respawnCountdown={respawnCountdown}
            lang={lang}
            roomInfo={roomMedia}
            roomId={roomId}
          />

          <MobileControls />
          <Radar />
        </>
      )}

      {/* Smooth Themed Transition Loader Overlay */}
      <div 
        className={`absolute inset-0 flex flex-col items-center justify-center bg-[#0f172a] text-white z-[100] transition-all duration-[1000ms] ease-out ${
          isRevealed ? "opacity-0 pointer-events-none scale-102" : "opacity-100"
        }`}
      >
        <div className="flex flex-col items-center gap-6 max-w-sm px-6 text-center">
          <div className="relative flex items-center justify-center w-20 h-20">
            <div className="absolute inset-0 border-2 border-emerald-500/20 rounded-full animate-ping" />
            <div className="absolute inset-2 border border-blue-500/30 rounded-full animate-spin duration-[3000ms]" />
            <div className="p-4 bg-zinc-900 border border-emerald-500/30 rounded-full text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <Rocket className="w-8 h-8 animate-bounce" />
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            <h3 className="text-lg font-bold tracking-wider text-emerald-400 font-sans uppercase">
              {mode === "multiplayer" ? (lang === "pt" ? "Arena de Batalha" : "Battle Arena") : (lang === "pt" ? "Simulador de Treino" : "Training Simulator")}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xs font-sans">
              {lang === "pt" 
                ? "Calibrando geradores procedimentais, sementes de naves e servidores espaciais..."
                : "Calibrating procedural builders, ship hull seeds, and deep space servers..."}
            </p>
          </div>

          <div className="flex flex-col items-center gap-2 w-full mt-2">
            <div className="w-48 h-1 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full bg-emerald-500 rounded-full animate-pulse w-full duration-1000" />
            </div>
            <span className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400/80 tracking-widest uppercase animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {socket ? (lang === "pt" ? "Sincronizando..." : "Synchronizing...") : (lang === "pt" ? "Conectando..." : "Connecting...")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
