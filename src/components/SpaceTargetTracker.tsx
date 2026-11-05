import React, { useState, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import { Navigation } from "lucide-react";

interface TargetInfo {
  id: string;
  name: string;
  distance: number;
  distFormatted: string;
  screenX: number;
  screenY: number;
  isOnScreen: boolean;
  angleDeg: number;
  health: number;
}

export function SpaceTargetTracker({
  players,
  remoteData,
  localData,
  onTargetSelect,
}: {
  players: any[];
  remoteData: React.MutableRefObject<Record<string, any>>;
  localData: React.MutableRefObject<any>;
  onTargetSelect?: (targetId: string) => void;
}) {
  const { camera, size } = useThree();
  const [targets, setTargets] = useState<TargetInfo[]>([]);
  const lastUpdateRef = useRef(0);
  const localPosRef = useRef(new THREE.Vector3());
  const cameraDirRef = useRef(new THREE.Vector3());
  const remotePosRef = useRef(new THREE.Vector3());
  const toTargetRef = useRef(new THREE.Vector3());

  useFrame((state) => {
    if (!players || players.length === 0) {
      if (targets.length > 0) setTargets([]);
      return;
    }

    // Throttle React state updates to ~12 FPS (every 80ms)
    // This prevents React from re-rendering the DOM 60 times a second
    const now = state.clock.getElapsedTime();
    if (now - lastUpdateRef.current < 0.08) return;
    lastUpdateRef.current = now;

    localPosRef.current.fromArray(localData.current.position || [0, 0, 0]);
    camera.getWorldDirection(cameraDirRef.current);

    const updatedTargets: TargetInfo[] = [];

    players.forEach((p) => {
      const rData = remoteData.current[p.id];
      if (!rData || !rData.position || rData.isDead) return;

      remotePosRef.current.fromArray(rData.position);
      const distance = Math.floor(localPosRef.current.distanceTo(remotePosRef.current));
      const distFormatted = distance < 1000 ? `${distance}m` : `${(distance / 1000).toFixed(1)}km`;

      // Project 3D position to Normalized Device Coordinates (NDC: [-1, 1])
      const projected = remotePosRef.current.clone().project(camera);

      // Check if target is in front of camera
      toTargetRef.current.copy(remotePosRef.current).sub(camera.position).normalize();
      const dot = cameraDirRef.current.dot(toTargetRef.current);
      const isBehind = dot <= 0;

      // Invert coordinates if behind camera so indicator flips to the correct edge
      let ndcX = projected.x;
      let ndcY = projected.y;
      if (isBehind) {
        ndcX = -ndcX;
        ndcY = -ndcY;
      }

      // Check if target is within current screen bounds
      const margin = 0.85;
      const isInFrustum = !isBehind && Math.abs(ndcX) < margin && Math.abs(ndcY) < margin;

      // Clamp to screen edges for off-screen pointer
      let clampedNdcX = ndcX;
      let clampedNdcY = ndcY;
      if (!isInFrustum) {
        const angle = Math.atan2(ndcY, ndcX);
        clampedNdcX = Math.cos(angle) * margin;
        clampedNdcY = Math.sin(angle) * margin;
      }

      // Convert NDC to screen pixels
      const screenX = (clampedNdcX * 0.5 + 0.5) * size.width;
      const screenY = (-clampedNdcY * 0.5 + 0.5) * size.height;

      // Calculate 2D screen direction angle (in degrees for arrow rotation)
      const angleDeg = (Math.atan2(size.height * 0.5 - screenY, screenX - size.width * 0.5) * 180) / Math.PI;

      updatedTargets.push({
        id: p.id,
        name: p.name || rData.name || "Piloto",
        distance,
        distFormatted,
        screenX,
        screenY,
        isOnScreen: isInFrustum,
        angleDeg,
        health: rData.health ?? 100,
      });
    });

    setTargets(updatedTargets);
  });

  if (targets.length === 0) return null;

  return (
    <Html fullscreen pointerEvents="none" zIndexRange={[100, 0]}>
      <div className="w-full h-full pointer-events-none overflow-hidden font-sans relative">
        {targets.map((t) => {
          if (t.isOnScreen) {
            // ============================================
            // 1. IN-SCREEN HOLOGRAPHIC BRACKET & DISTANCE
            // ============================================
            return (
              <div
                key={t.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto flex flex-col items-center gap-1 transition-transform duration-75 select-none"
                style={{ left: `${t.screenX}px`, top: `${t.screenY}px` }}
                onClick={() => onTargetSelect && onTargetSelect(t.id)}
              >
                {/* Sci-Fi Target Reticle Diamond */}
                <div className="relative w-8 h-8 flex items-center justify-center">
                  <div className="absolute inset-0 border border-emerald-400/80 rounded-md rotate-45 shadow-[0_0_12px_rgba(52,211,153,0.6)] animate-pulse" />
                  <div className="w-1.5 h-1.5 bg-emerald-300 rounded-full" />
                </div>

                {/* Informational Pilot Badge */}
                <div className="px-2.5 py-1 bg-black/80 backdrop-blur-md border border-emerald-500/50 rounded-lg shadow-lg flex items-center gap-2 text-white">
                  <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider font-mono">
                    {t.name}
                  </span>
                  <span className="text-[10px] text-amber-300 font-bold font-mono bg-amber-500/15 px-1.5 py-0.2 rounded border border-amber-500/30">
                    {t.distFormatted}
                  </span>
                </div>
              </div>
            );
          }

          // ============================================
          // 2. OFF-SCREEN DIRECTIONAL EDGE POINTER
          // ============================================
          return (
            <div
              key={t.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto flex items-center gap-1.5 transition-all duration-75 select-none"
              style={{ left: `${t.screenX}px`, top: `${t.screenY}px` }}
              onClick={() => onTargetSelect && onTargetSelect(t.id)}
            >
              {/* Edge Pointer Arrow oriented toward off-screen ship */}
              <div
                className="p-1.5 bg-emerald-500/30 border border-emerald-400 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.8)] backdrop-blur-md"
                style={{ transform: `rotate(${-t.angleDeg}deg)` }}
              >
                <Navigation className="w-4 h-4 text-emerald-300 fill-emerald-300" />
              </div>

              {/* Edge Distance Tag */}
              <div className="px-2 py-0.5 bg-black/85 border border-emerald-500/60 rounded-md text-[10px] font-mono font-bold text-emerald-300 shadow-xl flex items-center gap-1">
                <span className="max-w-[70px] truncate">{t.name}</span>
                <span className="text-amber-400">• {t.distFormatted}</span>
              </div>
            </div>
          );
        })}
      </div>
    </Html>
  );
}
