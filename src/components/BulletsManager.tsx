import React, { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Socket } from "socket.io-client";
import { activeBullets } from "../game/state";

const normalGeometry = new THREE.CapsuleGeometry(0.6, 3, 4, 8);
normalGeometry.rotateX(Math.PI / 2);
const normalMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffcc });

const missileGeometry = new THREE.CapsuleGeometry(1.2, 5, 4, 8);
missileGeometry.rotateX(Math.PI / 2);
const missileMaterial = new THREE.MeshBasicMaterial({ color: 0xff5500 });

export function BulletsManager({ socket }: { socket: Socket }) {
  const groupRef = useRef<THREE.Group>(null);
  const bullets = useRef<
    Map<
      string,
      { mesh: THREE.Mesh; velocity: THREE.Vector3; spawnedAt: number }
    >
  >(new Map());

  useEffect(() => {
    const onBullet = (data: any) => {
      const isMissile = data.type === 'missile';
      const geometry = isMissile ? missileGeometry : normalGeometry;
      const material = isMissile ? missileMaterial : normalMaterial;
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.fromArray(data.position);

      const vel = new THREE.Vector3().fromArray(data.velocity);
      mesh.lookAt(mesh.position.clone().add(vel));

      groupRef.current?.add(mesh);

      bullets.current.set(data.id, {
        mesh,
        velocity: vel,
        spawnedAt: Date.now(),
      });
      activeBullets.set(data.id, {
        position: mesh.position,
        velocity: vel,
        ownerId: data.ownerId,
        type: data.type
      });
    };

    const onDestroy = (id: string) => {
      const bullet = bullets.current.get(id);
      if (bullet) {
        groupRef.current?.remove(bullet.mesh);
        bullets.current.delete(id);
        activeBullets.delete(id);
      }
    };

    socket.on("bullet:new", onBullet);
    socket.on("bullet:destroy", onDestroy);
    return () => {
      socket.off("bullet:new", onBullet);
      socket.off("bullet:destroy", onDestroy);
    };
  }, [socket]);

  useFrame((state, delta) => {
    const now = Date.now();
    bullets.current.forEach((bullet, id) => {
      if (now - bullet.spawnedAt > 2000) {
        groupRef.current?.remove(bullet.mesh);
        bullets.current.delete(id);
        activeBullets.delete(id);
      } else {
        bullet.mesh.position.addScaledVector(bullet.velocity, delta);
        const active = activeBullets.get(id);
        if (active) {
          active.position.copy(bullet.mesh.position);
        }
      }
    });
  });

  return <group ref={groupRef} />;
}
