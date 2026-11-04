import * as THREE from "three";

export interface SpawnPoint {
  position: [number, number, number];
  quaternion: [number, number, number, number];
}

export const SUN_POSITION: [number, number, number] = [0, 0, -3000];
export const SUN_RADIUS = 400;

/**
 * Generates a random spawn point in deep space safely outside the Sun (radius 400).
 * Positions the ship in an orbital shell around the Sun at [0, 0, -3000],
 * and orientates the ship so its front directly faces the Sun center.
 */
export function generateSolarSpawnPoint(minDistance = 1600, maxDistance = 2400): SpawnPoint {
  // Random azimuth angle around Sun (0 to 2*PI)
  const theta = Math.random() * Math.PI * 2;
  // Elevation angle between -22 and +22 degrees for a majestic solar view
  const phi = (Math.random() - 0.5) * 0.78;
  // Distance safely outside the Sun (Sun radius is 400; safe distance is 1600-2400)
  const distance = minDistance + Math.random() * (maxDistance - minDistance);

  const posX = SUN_POSITION[0] + Math.cos(phi) * Math.sin(theta) * distance;
  const posY = SUN_POSITION[1] + Math.sin(phi) * distance;
  const posZ = SUN_POSITION[2] + Math.cos(phi) * Math.cos(theta) * distance;

  // In Three.js, Object3D.lookAt(target) rotates the object so its local -Z axis (ship front)
  // points directly at the target [0, 0, -3000]
  const dummy = new THREE.Object3D();
  dummy.position.set(posX, posY, posZ);
  dummy.lookAt(SUN_POSITION[0], SUN_POSITION[1], SUN_POSITION[2]);

  return {
    position: [
      parseFloat(posX.toFixed(2)),
      parseFloat(posY.toFixed(2)),
      parseFloat(posZ.toFixed(2)),
    ],
    quaternion: [
      parseFloat(dummy.quaternion.x.toFixed(5)),
      parseFloat(dummy.quaternion.y.toFixed(5)),
      parseFloat(dummy.quaternion.z.toFixed(5)),
      parseFloat(dummy.quaternion.w.toFixed(5)),
    ],
  };
}

/**
 * Checks if a position is safely outside the Sun (Sun center is [0, 0, -3000], radius 400).
 */
export function isOutsideSun(pos: any, minDistance = 600): boolean {
  if (!pos || !Array.isArray(pos) || pos.length < 3) return false;
  const x = Number(pos[0]) || 0;
  const y = Number(pos[1]) || 0;
  const z = Number(pos[2]) || 0;
  const dx = x - SUN_POSITION[0];
  const dy = y - SUN_POSITION[1];
  const dz = z - SUN_POSITION[2];
  const distSq = dx * dx + dy * dy + dz * dz;
  return distSq >= minDistance * minDistance;
}

