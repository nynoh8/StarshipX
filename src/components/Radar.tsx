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
      if (!rData || !rData.position) return;
      const remotePos = new THREE.Vector3().fromArray(rData.position);
      const relativePos = remotePos.clone().sub(localPos);
      relativePos.applyQuaternion(localQuat.clone().invert());

      const scale = 50 / 4000;
      let rx = relativePos.x * scale;
      let ry = relativePos.z * scale;

      const dist = Math.sqrt(rx * rx + ry * ry);
      if (dist > 45) {
        rx = (rx / dist) * 45;
        ry = (ry / dist) * 45;
      }

      html += `<div style="position:absolute; width:6px; height:6px; background:#ef4444; border-radius:50%; left:calc(50% + ${rx}px); top:calc(50% + ${ry}px); transform:translate(-50%, -50%); box-shadow:0 0 5px #ef4444;"></div>`;
    });

    radarDOM.innerHTML = html;
  });
  return null;
}

export function Radar() {
  return (
    <div className="absolute bottom-6 right-6 w-32 h-32 bg-emerald-900/20 border-2 border-emerald-500/50 rounded-full backdrop-blur-md overflow-hidden pointer-events-none">
      <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 shadow-[0_0_5px_white]"></div>
      <div id="radar-dots" className="absolute inset-0"></div>
    </div>
  );
}
