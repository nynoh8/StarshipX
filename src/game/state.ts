import * as THREE from "three";

export const activeBullets = new Map<string, { position: THREE.Vector3, velocity: THREE.Vector3, ownerId: string, type?: string }>();
export const planetPositions = new Map<string, { position: THREE.Vector3, radius: number }>();
export const playerState = { lastMissileTime: 0 };
