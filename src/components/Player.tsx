import React, { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useKeyboardControls } from "@react-three/drei";
import { Socket } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";
import { Part } from "../utils/spaceshipGenerator";
import { SpaceshipModel } from "./SpaceshipModel";
import { touchState } from "./MobileControls";
import { activeBullets, planetPositions, playerState } from "../game/state";
import { p2pMesh } from "../utils/p2pMesh";

function getGamepadState() {
  const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
  const gp = gamepads[0];
  if (!gp) return {};

  return {
    pitchUp: gp.axes[1] > 0.2 || gp.buttons[13]?.pressed,
    pitchDown: gp.axes[1] < -0.2 || gp.buttons[12]?.pressed,
    yawLeft: gp.axes[0] < -0.2 || gp.buttons[14]?.pressed,
    yawRight: gp.axes[0] > 0.2 || gp.buttons[15]?.pressed,
    rollLeft: gp.buttons[4]?.pressed,
    rollRight: gp.buttons[5]?.pressed,
    thrust: gp.buttons[7]?.pressed,
    brake: gp.buttons[6]?.pressed,
    shoot: gp.buttons[0]?.pressed,
    missile: gp.buttons[2]?.pressed || gp.buttons[1]?.pressed,
  };
}

function useMergedControls() {
  const [, getKeyboard] = useKeyboardControls();
  
  return () => {
    const kbd = getKeyboard();
    const gp = getGamepadState();
    
    return {
      pitchUp: kbd.pitchUp || gp.pitchUp || touchState.pitchUp,
      pitchDown: kbd.pitchDown || gp.pitchDown || touchState.pitchDown,
      yawLeft: kbd.yawLeft || gp.yawLeft || touchState.yawLeft,
      yawRight: kbd.yawRight || gp.yawRight || touchState.yawRight,
      rollLeft: kbd.rollLeft || gp.rollLeft || touchState.rollLeft,
      rollRight: kbd.rollRight || gp.rollRight || touchState.rollRight,
      thrust: kbd.thrust || gp.thrust || touchState.thrust,
      brake: kbd.brake || gp.brake || touchState.brake,
      shoot: kbd.shoot || gp.shoot || touchState.shoot,
      missile: kbd.missile || gp.missile || touchState.missile,
    };
  };
}

export function Player({
  parts,
  socket,
  localData,
  remoteData,
  health,
  isDead,
  stats,
  playerName,
}: {
  parts: Part[];
  socket: any;
  localData: React.MutableRefObject<any>;
  remoteData: React.MutableRefObject<any>;
  health: number;
  isDead: boolean;
  stats: any;
  playerName: string;
}) {
  const shipRef = useRef<THREE.Group>(null);
  const thrusterRef = useRef<THREE.Group>(null);
  const thrusterLightRef = useRef<THREE.PointLight>(null);
  const getControls = useMergedControls();
  const velocity = useRef(0);
  const angularVelocity = useRef(new THREE.Vector3(0, 0, 0));
  const lastEmit = useRef(0);
  const lastShoot = useRef(0);
  const cameraInitialized = useRef(false);

  useEffect(() => {
    if (shipRef.current && localData.current) {
      shipRef.current.position.fromArray(localData.current.position);
      if (localData.current.quaternion) {
        shipRef.current.quaternion.fromArray(localData.current.quaternion);
      }
      velocity.current = 0;
      angularVelocity.current.set(0, 0, 0);
      cameraInitialized.current = false;
    }
  }, [parts, isDead]);

  useEffect(() => {
    const handleCorrectPosition = (data: { position: [number, number, number]; quaternion?: [number, number, number, number] }) => {
      if (shipRef.current) {
        shipRef.current.position.fromArray(data.position);
        if (data.quaternion) {
          shipRef.current.quaternion.fromArray(data.quaternion);
        }
        velocity.current = 0;
        localData.current.position = data.position;
        if (data.quaternion) {
          localData.current.quaternion = data.quaternion;
        }
      }
    };

    socket.on("player:correct_position", handleCorrectPosition);
    return () => {
      socket.off("player:correct_position", handleCorrectPosition);
    };
  }, [socket]);

  useFrame((state, delta) => {
    if (!shipRef.current) return;

    if (isDead) {
      const time = state.clock.elapsedTime;
      const radius = 100;
      const idealOffset = new THREE.Vector3(
        localData.current.position[0] + Math.cos(time * 0.5) * radius,
        localData.current.position[1] + 50,
        localData.current.position[2] + Math.sin(time * 0.5) * radius
      );
      state.camera.position.lerp(idealOffset, 0.05);
      state.camera.lookAt(
        localData.current.position[0],
        localData.current.position[1],
        localData.current.position[2]
      );
      return;
    }

    const { pitchUp, pitchDown, yawLeft, yawRight, rollLeft, rollRight, thrust, brake, shoot, missile } = getControls();

    const speedMult = stats?.speedMultiplier || 1;
    const turnMult = stats?.turnSpeedMultiplier || 1;
    const fireRateMult = stats?.fireRateMultiplier || 1;

    const turnPower = 3.0 * turnMult;
    
    if (pitchUp) angularVelocity.current.x += turnPower * delta;
    if (pitchDown) angularVelocity.current.x -= turnPower * delta;
    if (yawLeft) angularVelocity.current.y += turnPower * delta;
    if (yawRight) angularVelocity.current.y -= turnPower * delta;
    if (rollLeft) angularVelocity.current.z += turnPower * delta;
    if (rollRight) angularVelocity.current.z -= turnPower * delta;

    angularVelocity.current.multiplyScalar(0.92);

    shipRef.current.rotateX(angularVelocity.current.x * delta);
    shipRef.current.rotateY(angularVelocity.current.y * delta);
    shipRef.current.rotateZ(angularVelocity.current.z * delta);

    if (thrust) {
      velocity.current = THREE.MathUtils.lerp(velocity.current, 200 * speedMult, delta * 0.5);
    } else if (brake) {
      velocity.current = THREE.MathUtils.lerp(velocity.current, 0, delta * 2);
    } else {
      velocity.current = THREE.MathUtils.lerp(velocity.current, 30 * speedMult, delta * 0.2);
    }

    shipRef.current.translateZ(-velocity.current * delta);

    if (shoot && state.clock.elapsedTime - lastShoot.current > (0.15 / fireRateMult)) {
      lastShoot.current = state.clock.elapsedTime;
      const bulletPos = shipRef.current.position.clone();
      const bulletDir = new THREE.Vector3(0, 0, -1).applyQuaternion(
        shipRef.current.quaternion,
      );
      // Spawn further ahead to compensate for engine dimensions and speed/latency differences
      const noseOffset = 14 + (velocity.current * 0.18);
      bulletPos.add(bulletDir.clone().multiplyScalar(noseOffset));

      // Add ship's current velocity to bullet's base velocity
      const shipVel = bulletDir.clone().multiplyScalar(velocity.current);
      const finalBulletVel = bulletDir.clone().multiplyScalar(500).add(shipVel);

      socket.emit("shoot", {
        id: uuidv4(),
        position: bulletPos.toArray(),
        velocity: finalBulletVel.toArray(),
        type: 'normal'
      });
    }

    if (missile && Date.now() - playerState.lastMissileTime > 10000) {
      playerState.lastMissileTime = Date.now();
      const bulletPos = shipRef.current.position.clone();
      const bulletDir = new THREE.Vector3(0, 0, -1).applyQuaternion(
        shipRef.current.quaternion,
      );
      // Spawn further ahead to compensate for engine dimensions and speed/latency differences
      const noseOffset = 14 + (velocity.current * 0.18);
      bulletPos.add(bulletDir.clone().multiplyScalar(noseOffset));

      const shipVel = bulletDir.clone().multiplyScalar(velocity.current);
      const finalBulletVel = bulletDir.clone().multiplyScalar(250).add(shipVel);

      socket.emit("shoot", {
        id: uuidv4(),
        position: bulletPos.toArray(),
        velocity: finalBulletVel.toArray(),
        type: 'missile'
      });
    }

    activeBullets.forEach((bullet, id) => {
      if (bullet.ownerId !== socket.id) {
        const dist = shipRef.current!.position.distanceTo(bullet.position);
        if (dist < 4.0) {
          const damageAmount = bullet.type === 'missile' ? 60 : 20;
          socket.emit("damage", { targetId: socket.id, attackerId: bullet.ownerId, amount: damageAmount, bulletId: id });
          activeBullets.delete(id);
        }
      } else {
        // Check if my bullet hits an NPC
        Object.keys(remoteData.current).forEach((playerId) => {
          const rData = remoteData.current[playerId];
          if (rData && rData.isNPC && !rData.isDead && rData.position) {
            const remotePos = new THREE.Vector3().fromArray(rData.position);
            const dist = remotePos.distanceTo(bullet.position);
            if (dist < 4.0) {
              const damageAmount = bullet.type === 'missile' ? 60 : 20;
              socket.emit("damage", { targetId: playerId, attackerId: socket.id, amount: damageAmount, bulletId: id });
              activeBullets.delete(id);
            }
          }
        });
      }
    });

    Object.keys(remoteData.current).forEach((playerId) => {
      if (playerId !== socket.id) {
        const rData = remoteData.current[playerId];
        if (!rData || !rData.position || rData.isDead) return;
        const remotePos = new THREE.Vector3().fromArray(rData.position);
        const dist = shipRef.current!.position.distanceTo(remotePos);
        if (dist < 4.0) {
          socket.emit("damage", { targetId: socket.id, attackerId: playerId, amount: 9999, bulletId: "player_collision" });
        }
      }
    });

    // Removing planet gravity/collision as requested
    // planetPositions.forEach((planet) => {
    //   const dist = shipRef.current!.position.distanceTo(planet.position);
    //   if (dist < planet.radius + 2) {
    //     socket.emit("damage", { targetId: socket.id, attackerId: socket.id, amount: 9999, bulletId: "planet" });
    //   }
    // });

    const isBoosting = Boolean(thrust);
    const targetFov = isBoosting ? 68 : brake ? 57 : 60;
    if (state.camera instanceof THREE.PerspectiveCamera) {
      state.camera.fov = THREE.MathUtils.lerp(state.camera.fov, targetFov, delta * 3.5);
      state.camera.updateProjectionMatrix();
    }

    if (thrusterRef.current) {
      const targetScaleZ = isBoosting
        ? 3.0 + Math.random() * 0.5
        : velocity.current > 15
        ? 1.2 + Math.random() * 0.2
        : 0.35;
      const targetScaleXY = isBoosting ? 1.5 : 1.0;
      thrusterRef.current.scale.z = THREE.MathUtils.lerp(thrusterRef.current.scale.z, targetScaleZ, delta * 12);
      thrusterRef.current.scale.x = THREE.MathUtils.lerp(thrusterRef.current.scale.x, targetScaleXY, delta * 12);
      thrusterRef.current.scale.y = THREE.MathUtils.lerp(thrusterRef.current.scale.y, targetScaleXY, delta * 12);
    }

    if (thrusterLightRef.current) {
      const targetIntensity = isBoosting ? 8 : velocity.current > 15 ? 3 : 1;
      thrusterLightRef.current.intensity = THREE.MathUtils.lerp(thrusterLightRef.current.intensity, targetIntensity, delta * 10);
    }

    const idealOffset = new THREE.Vector3(0, 5, 15);
    idealOffset.applyQuaternion(shipRef.current.quaternion);
    idealOffset.add(shipRef.current.position);

    const idealLookAt = new THREE.Vector3(0, 0, -20);
    idealLookAt.applyQuaternion(shipRef.current.quaternion);
    idealLookAt.add(shipRef.current.position);

    if (!cameraInitialized.current) {
      state.camera.position.copy(idealOffset);
      state.camera.lookAt(idealLookAt);
      cameraInitialized.current = true;
    } else {
      state.camera.position.lerp(idealOffset, 0.12);
      state.camera.lookAt(idealLookAt);
    }

    if (state.clock.elapsedTime - lastEmit.current > 0.05) {
      lastEmit.current = state.clock.elapsedTime;
      const pos = shipRef.current.position.toArray();
      const quat = shipRef.current.quaternion.toArray();

      localData.current.position = pos;
      localData.current.quaternion = quat;

      // Broadcast directly to peers over WebRTC DataChannel (zero server lag)
      p2pMesh.broadcast("move", { position: pos, quaternion: quat });

      socket.emit("move", {
        position: pos,
        quaternion: quat,
      });
    }
  });

  return (
    <group ref={shipRef} renderOrder={10}>
      <group visible={!isDead}>
        <SpaceshipModel parts={parts} />
        
        {/* Dynamic Plasma Thruster Exhaust Flame */}
        <group ref={thrusterRef} position={[0, 0, 3.8]}>
          {/* Inner Core Jet Flame (Electric Cyan) */}
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 1.8]}>
            <coneGeometry args={[0.65, 4.2, 16, 1, true]} />
            <meshBasicMaterial
              color="#38bdf8"
              transparent
              opacity={0.9}
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
          {/* Outer Heat Flame (Warm Orange/Violet Glow) */}
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 2.4]}>
            <coneGeometry args={[1.15, 5.2, 16, 1, true]} />
            <meshBasicMaterial
              color="#fb923c"
              transparent
              opacity={0.5}
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </group>

        <pointLight
          ref={thrusterLightRef}
          position={[0, 0, 4.5]}
          intensity={3}
          color="#38bdf8"
          distance={28}
        />

        <pointLight
          position={[0, 0, 5]}
          intensity={2}
          color="#dbeafe"
          distance={20}
        />
        <pointLight
          position={[0, 8, 0]}
          intensity={3}
          color="#f8fafc"
          distance={40}
        />

        {/* Enhanced 3D Holographic Cockpit Crosshair */}
        <group position={[0, 0, -200]}>
          {/* Outer HUD Ring */}
          <mesh>
            <ringGeometry args={[2.8, 3.1, 32]} />
            <meshBasicMaterial color="#10b981" transparent opacity={0.35} side={THREE.DoubleSide} />
          </mesh>
          {/* Center Target Dot */}
          <mesh>
            <circleGeometry args={[0.35, 16]} />
            <meshBasicMaterial color="#34d399" transparent opacity={0.9} side={THREE.DoubleSide} />
          </mesh>
          {/* Pitch & Yaw Holographic Reticle Lines */}
          <mesh position={[0, 4.5, 0]}>
            <planeGeometry args={[0.4, 2.5]} />
            <meshBasicMaterial color="#34d399" transparent opacity={0.7} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, -4.5, 0]}>
            <planeGeometry args={[0.4, 2.5]} />
            <meshBasicMaterial color="#34d399" transparent opacity={0.7} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[4.5, 0, 0]}>
            <planeGeometry args={[2.5, 0.4]} />
            <meshBasicMaterial color="#34d399" transparent opacity={0.7} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[-4.5, 0, 0]}>
            <planeGeometry args={[2.5, 0.4]} />
            <meshBasicMaterial color="#34d399" transparent opacity={0.7} side={THREE.DoubleSide} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
