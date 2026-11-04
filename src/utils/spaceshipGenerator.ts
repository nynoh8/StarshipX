import { v4 as uuidv4 } from "uuid";

export type PartType = "box" | "cylinder" | "cone";

export type ColorPalette = "random" | "stealth" | "neon" | "industrial" | "royal";

export const palettes: Record<Exclude<ColorPalette, "random">, { primary: string[], secondary: string[], accent: string[], material: { roughness: number, metalness: number } }> = {
  stealth: {
    primary: ["#0f172a", "#1e293b", "#09090b"],
    secondary: ["#334155", "#475569", "#27272a"],
    accent: ["#ef4444", "#f97316", "#3b82f6"],
    material: { roughness: 0.8, metalness: 0.2 }
  },
  neon: {
    primary: ["#2e1065", "#172554", "#083344"],
    secondary: ["#4c1d95", "#1e3a8a", "#164e63"],
    accent: ["#a855f7", "#06b6d4", "#f43f5e", "#10b981"],
    material: { roughness: 0.2, metalness: 0.8 }
  },
  industrial: {
    primary: ["#451a03", "#78350f", "#3f3f46"],
    secondary: ["#713f12", "#b45309", "#52525b"],
    accent: ["#fbbf24", "#f59e0b", "#d97706"],
    material: { roughness: 0.6, metalness: 0.5 }
  },
  royal: {
    primary: ["#831843", "#4c0519", "#312e81"],
    secondary: ["#be185d", "#881337", "#4338ca"],
    accent: ["#fbbf24", "#fcd34d", "#fde047"],
    material: { roughness: 0.3, metalness: 0.9 }
  }
};

export interface Part {
  id: string;
  type: PartType;
  position: [number, number, number];
  scale: [number, number, number];
  rotation: [number, number, number];
  color: string;
  roughness?: number;
  metalness?: number;
  isGlow?: boolean;
}

const baseColors = [
  "#1e293b", // dark slate
  "#334155", // slate
  "#1e3a8a", // dark blue
  "#312e81", // dark indigo
  "#4c1d95", // dark violet
  "#701a75", // dark fuchsia
  "#831843", // dark pink
  "#7f1d1d", // dark red
  "#7c2d12", // dark orange
  "#713f12", // dark yellow
  "#14532d", // dark green
  "#064e3b", // dark emerald
  "#164e63", // dark cyan
];
const accentColors = [
  "#3b82f6", // blue
  "#eab308", // yellow
  "#ef4444", // red
  "#f97316", // orange
  "#22c55e", // green
  "#a855f7", // violet
  "#64748b", // slate
];

function randomChoice<T>(arr: T[], random: () => number): T {
  return arr[Math.floor(random() * arr.length)];
}

export function generateSpaceship(seedWithPalette?: string): Part[] {
  let seed = seedWithPalette;
  let palette: ColorPalette = "random";
  
  if (seedWithPalette && seedWithPalette.includes('_')) {
    const parts = seedWithPalette.split('_');
    seed = parts[0];
    palette = parts[1] as ColorPalette;
  }

  let rngState = 0;
  if (seed) {
    for (let i = 0; i < seed.length; i++) {
      rngState = seed.charCodeAt(i) + ((rngState << 5) - rngState);
    }
  } else {
    rngState = Math.random() * 1000000;
  }

  const random = () => {
    const x = Math.sin(rngState++) * 10000;
    return x - Math.floor(x);
  };

  const parts: Part[] = [];
  
  let primaryColor, secondaryColor, accentColor;
  
  if (palette === "random" || !palettes[palette]) {
    primaryColor = randomChoice(baseColors, random);
    secondaryColor = randomChoice(baseColors, random);
    accentColor = randomChoice(accentColors, random);
  } else {
    const p = palettes[palette];
    primaryColor = randomChoice(p.primary, random);
    secondaryColor = randomChoice(p.secondary, random);
    accentColor = randomChoice(p.accent, random);
  }
  
  const glassColor = "#44ccff";

  const getThemeColor = () => {
    const r = random();
    if (r < 0.6) return primaryColor;
    if (r < 0.9) return secondaryColor;
    return accentColor;
  };

  // Main hull
  const hullLength = 4 + random() * 8;
  const hullWidth = 1 + random() * 3;
  const hullHeight = 1 + random() * 2;

  parts.push({
    id: uuidv4(),
    type: "box",
    position: [0, 0, 0],
    scale: [hullWidth, hullHeight, hullLength],
    rotation: [0, 0, 0],
    color: primaryColor,
  });

  // Cockpit
  const cockpitLength = 1 + random() * 2;
  const cockpitWidth = hullWidth * (0.4 + random() * 0.4);
  const cockpitHeight = 0.5 + random() * 1.5;
  const cockpitZ = random() * (hullLength / 2) - cockpitLength / 2;

  parts.push({
    id: uuidv4(),
    type: "box",
    position: [0, hullHeight / 2 + cockpitHeight / 2, cockpitZ],
    scale: [cockpitWidth, cockpitHeight, cockpitLength],
    rotation: [0, 0, 0],
    color: secondaryColor,
  });

  // Cockpit Glass
  parts.push({
    id: uuidv4(),
    type: "box",
    position: [
      0,
      hullHeight / 2 + cockpitHeight / 2 + 0.1,
      cockpitZ + cockpitLength / 2 + 0.1,
    ],
    scale: [cockpitWidth * 0.8, cockpitHeight * 0.8, 0.2],
    rotation: [Math.PI / 8, 0, 0],
    color: glassColor,
  });

  // Wings
  const wingCount = 1 + Math.floor(random() * 3);
  for (let i = 0; i < wingCount; i++) {
    const wingSpan = 2 + random() * 8;
    const wingLength = 1 + random() * 5;
    const wingThickness = 0.2 + random() * 0.8;
    const wingZ = -hullLength / 2 + random() * hullLength * 0.8;
    const wingY = (random() - 0.5) * hullHeight;
    const wingColor = getThemeColor();

    // Right wing
    parts.push({
      id: uuidv4(),
      type: "box",
      position: [hullWidth / 2 + wingSpan / 2, wingY, wingZ],
      scale: [wingSpan, wingThickness, wingLength],
      rotation: [0, 0, 0],
      color: wingColor,
    });

    // Left wing (mirrored)
    parts.push({
      id: uuidv4(),
      type: "box",
      position: [-(hullWidth / 2 + wingSpan / 2), wingY, wingZ],
      scale: [wingSpan, wingThickness, wingLength],
      rotation: [0, 0, 0],
      color: wingColor,
    });

    // Wing attachments / weapons / pods
    if (random() > 0.3) {
      const podLength = 1 + random() * 4;
      const podRadius = 0.2 + random() * 0.6;
      const podColor = getThemeColor();
      const podType = random() > 0.5 ? "cylinder" : "box";

      parts.push({
        id: uuidv4(),
        type: podType,
        position: [hullWidth / 2 + wingSpan, wingY, wingZ + wingLength / 4],
        scale:
          podType === "cylinder"
            ? [podRadius, podLength, podRadius]
            : [podRadius * 2, podRadius * 2, podLength],
        rotation: podType === "cylinder" ? [Math.PI / 2, 0, 0] : [0, 0, 0],
        color: podColor,
      });
      parts.push({
        id: uuidv4(),
        type: podType,
        position: [-(hullWidth / 2 + wingSpan), wingY, wingZ + wingLength / 4],
        scale:
          podType === "cylinder"
            ? [podRadius, podLength, podRadius]
            : [podRadius * 2, podRadius * 2, podLength],
        rotation: podType === "cylinder" ? [Math.PI / 2, 0, 0] : [0, 0, 0],
        color: podColor,
      });
    }
  }

  // Engines
  const engineCount = 1 + Math.floor(random() * 3);
  const engineRadius = 0.4 + random() * 1.2;
  const engineLength = 1 + random() * 3;
  const engineColor = secondaryColor;
  const glowColor = accentColor;

  if (engineCount === 1 || random() > 0.5) {
    // Single central engine
    parts.push({
      id: uuidv4(),
      type: "cylinder",
      position: [0, 0, -hullLength / 2 - engineLength / 2],
      scale: [engineRadius, engineLength, engineRadius],
      rotation: [Math.PI / 2, 0, 0],
      color: engineColor,
    });
    // Engine glow
    parts.push({
      id: uuidv4(),
      type: "cylinder",
      position: [0, 0, -hullLength / 2 - engineLength - 0.1],
      scale: [engineRadius * 0.8, 0.2, engineRadius * 0.8],
      rotation: [Math.PI / 2, 0, 0],
      color: glowColor,
      isGlow: true,
    });
  }

  if (engineCount > 1) {
    // Paired engines
    const pairs = Math.floor(engineCount / 2) + (engineCount === 2 ? 1 : 0);
    for (let i = 0; i < pairs; i++) {
      const engineX = hullWidth / 2 + random() * 2;
      const engineY = (random() - 0.5) * hullHeight;
      parts.push({
        id: uuidv4(),
        type: "cylinder",
        position: [
          engineX,
          engineY,
          -hullLength / 2 - engineLength / 2 + random(),
        ],
        scale: [engineRadius, engineLength, engineRadius],
        rotation: [Math.PI / 2, 0, 0],
        color: engineColor,
      });
      parts.push({
        id: uuidv4(),
        type: "cylinder",
        position: [
          -engineX,
          engineY,
          -hullLength / 2 - engineLength / 2 + random(),
        ],
        scale: [engineRadius, engineLength, engineRadius],
        rotation: [Math.PI / 2, 0, 0],
        color: engineColor,
      });

      // Glows
      parts.push({
        id: uuidv4(),
        type: "cylinder",
        position: [engineX, engineY, -hullLength / 2 - engineLength - 0.1],
        scale: [engineRadius * 0.8, 0.2, engineRadius * 0.8],
        rotation: [Math.PI / 2, 0, 0],
        color: glowColor,
        isGlow: true,
      });
      parts.push({
        id: uuidv4(),
        type: "cylinder",
        position: [-engineX, engineY, -hullLength / 2 - engineLength - 0.1],
        scale: [engineRadius * 0.8, 0.2, engineRadius * 0.8],
        rotation: [Math.PI / 2, 0, 0],
        color: glowColor,
        isGlow: true,
      });
    }
  }

  // Greebles (small details on hull)
  const greebleCount = 5 + Math.floor(random() * 15);
  for (let i = 0; i < greebleCount; i++) {
    const gSize = 0.2 + random() * 0.8;
    const gX = (random() - 0.5) * hullWidth;
    const gY = hullHeight / 2 + gSize / 2;
    const gZ = (random() - 0.5) * hullLength;

    parts.push({
      id: uuidv4(),
      type: "box",
      position: [gX, gY, gZ],
      scale: [gSize, gSize, gSize],
      rotation: [0, 0, 0],
      color: getThemeColor(),
    });
    // Mirrored greeble if not central
    if (Math.abs(gX) > 0.2) {
      parts.push({
        id: uuidv4(),
        type: "box",
        position: [-gX, gY, gZ],
        scale: [gSize, gSize, gSize],
        rotation: [0, 0, 0],
        color: getThemeColor(),
      });
    }
  }

  const materialProps = palette !== "random" && palettes[palette] 
    ? palettes[palette].material 
    : { roughness: 0.4, metalness: 0.6 };

  return parts.map(part => {
    if (part.color === glassColor) {
      return { ...part, roughness: 0.1, metalness: 0.9 };
    }
    if (part.color === glowColor) {
      return { ...part, roughness: 1.0, metalness: 0.0 };
    }
    return { ...part, ...materialProps };
  });
}
