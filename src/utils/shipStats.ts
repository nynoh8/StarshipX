export function getShipStats(seedWithPalette: string) {
  const seed = seedWithPalette.split('_')[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const random = (offset: number) => {
    const x = Math.sin(hash + offset) * 10000;
    return x - Math.floor(x);
  };

  return {
    maxHealth: Math.floor(70 + Math.abs(random(1)) * 80), // 70 to 150
    speedMultiplier: 0.8 + Math.abs(random(2)) * 0.5, // 0.8 to 1.3
    damageMultiplier: 0.7 + Math.abs(random(3)) * 0.8, // 0.7 to 1.5
    fireRateMultiplier: 0.7 + Math.abs(random(4)) * 0.8, // 0.7 to 1.5
    turnSpeedMultiplier: 0.8 + Math.abs(random(5)) * 0.6, // 0.8 to 1.4
  };
}
