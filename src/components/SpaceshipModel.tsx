import React, { forwardRef } from "react";
import * as THREE from "three";
import { Part } from "../utils/spaceshipGenerator";

const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
const cylinderGeometry = new THREE.CylinderGeometry(1, 1, 1, 16);
const coneGeometry = new THREE.ConeGeometry(1, 1, 16);

export const SpaceshipModel = forwardRef<THREE.Group, { parts: Part[], onPartClick?: (partId?: string) => void, selectedPartId?: string }>(
  ({ parts, onPartClick, selectedPartId }, ref) => {
    return (
      <group ref={ref}>
        {parts.map((part) => {
          let geometry;
          switch (part.type) {
            case "box":
              geometry = boxGeometry;
              break;
            case "cylinder":
              geometry = cylinderGeometry;
              break;
            case "cone":
              geometry = coneGeometry;
              break;
            default:
              geometry = boxGeometry;
          }

          const isSelected = selectedPartId === part.id;

          return (
            <mesh
              key={part.id}
              position={part.position}
              scale={part.scale}
              rotation={part.rotation}
              geometry={geometry}
              castShadow
              receiveShadow
              onClick={(e) => {
                if (onPartClick) {
                  e.stopPropagation();
                  onPartClick(part.id);
                }
              }}
            >
              <meshStandardMaterial
                color={part.color}
                roughness={part.roughness ?? 0.4}
                metalness={part.metalness ?? 0.6}
                emissive={isSelected ? "#ffffff" : (part.isGlow ? part.color : undefined)}
                emissiveIntensity={isSelected ? 0.5 : (part.isGlow ? 1.5 : 0)}
              />
              {isSelected && (
                <lineSegments>
                  <edgesGeometry args={[geometry]} />
                  <lineBasicMaterial color="#00ff00" linewidth={2} />
                </lineSegments>
              )}
            </mesh>
          );
        })}
      </group>
    );
  },
);
