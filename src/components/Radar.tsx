import React from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function RadarLogic({
  players,
  remoteData,
  localData,
}: {
  players: any[];
  remoteData: any;
  localData: any;
}) {
  useFrame(() => {
    const radarDOM = document.getElementById("radar-dots");
    if (!radarDOM) return;

    const localPos = new THREE.Vector3().fromArray(
      localData.current.position || [0, 0, 0],
    );
    const localQuat = new THREE.Quaternion().fromArray(
      localData.current.quaternion || [0, 0, 0, 1],
    );

    let html = "";
    players.forEach((p) => {
      const rData = remoteData.current[p.id];
      if (!rData || !rData.position || rData.isDead) return;

      const remotePos = new THREE.Vector3().fromArray(rData.position);
      const relativePos = remotePos.clone().sub(localPos);
      relativePos.applyQuaternion(localQuat.clone().invert());

      // 4000 meter radar radius scaled to 60px half-radius
      const scale = 54 / 4000;
      let rx = relativePos.x * scale;
      let ry = relativePos.z * scale;

      const dist = Math.sqrt(rx * rx + ry * ry);
      if (dist > 52) {
        rx = (rx / dist) * 52;
        ry = (ry / dist) * 52;
      }

      html += `
        <div style="
          position:absolute;
          width:8px;
          height:8px;
          background:#34d399;
          border-radius:50%;
          left:calc(50% + ${rx}px);
          top:calc(50% + ${ry}px);
          transform:translate(-50%, -50%);
          box-shadow:0 0 10px #10b981, 0 0 4px #fff;
          border:1px solid #ffffff;
        ">
          <div style="position:absolute; width:18px; height:18px; border:1px solid rgba(52, 211, 153, 0.4); border-radius:50%; top:-6px; left:-6px; animation:ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        </div>
      `;
    });

    radarDOM.innerHTML = html;
  });
  return null;
}

export function Radar() {
  return (
    <div className="absolute bottom-6 right-6 w-36 h-36 bg-black/75 border-2 border-emerald-500/50 rounded-full backdrop-blur-md overflow-hidden pointer-events-none shadow-[0_0_25px_rgba(16,185,129,0.25)]">
      {/* Outer & Inner Range Rings */}
      <div className="absolute inset-2 border border-emerald-500/20 rounded-full" />
      <div className="absolute inset-8 border border-emerald-500/20 rounded-full" />

      {/* Crosshairs */}
      <div className="absolute top-0 bottom-0 left-1/2 w-px bg-emerald-500/25 -translate-x-1/2" />
      <div className="absolute left-0 right-0 top-1/2 h-px bg-emerald-500/25 -translate-y-1/2" />

      {/* Radar Sweep Animation */}
      <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,transparent_270deg,rgba(16,185,129,0.25)_360deg)] animate-[spin_4s_linear_infinite]" />

      {/* Player Self Dot */}
      <div className="absolute top-1/2 left-1/2 w-2.5 h-2.5 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 shadow-[0_0_8px_white]" />

      {/* Range Labels */}
      <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[8px] font-mono font-bold text-emerald-400/70">
        4KM
      </span>
      <span className="absolute top-7 left-1/2 -translate-x-1/2 text-[7px] font-mono font-bold text-emerald-400/50">
        2KM
      </span>

      {/* Dynamic Dots Container */}
      <div id="radar-dots" className="absolute inset-0" />
    </div>
  );
}
