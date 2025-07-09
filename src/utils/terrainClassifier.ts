import { TerrainType } from '../types/simulation';

/**
 * Convert RGB to HSV color space
 */
function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;

  let h = 0;
  if (diff !== 0) {
    if (max === r) h = ((g - b) / diff) % 6;
    else if (max === g) h = (b - r) / diff + 2;
    else h = (r - g) / diff + 4;
  }
  h = Math.round(60 * h);
  if (h < 0) h += 360;

  const s = max === 0 ? 0 : Math.round((diff / max) * 100);
  const v = Math.round(max * 100);

  return { h, s, v };
}

/**
 * Classify terrain type based on pixel color
 */
export function classifyTerrain(r: number, g: number, b: number): TerrainType {
  const { h, s, v } = rgbToHsv(r, g, b);

  // Water: Blue tones
  if (h >= 180 && h <= 240 && s > 30 && v > 20) {
    return TerrainType.WATER;
  }

  // Forest: Dark green tones
  if (h >= 80 && h <= 160 && s > 30 && v < 60) {
    return TerrainType.FOREST;
  }

  // Grass: Light green tones
  if (h >= 60 && h <= 120 && s > 20 && v >= 40) {
    return TerrainType.GRASS;
  }

  // Urban: Gray tones
  if (s < 20 && v > 30 && v < 80) {
    return TerrainType.URBAN;
  }

  // Farmland: Yellow/brown tones
  if ((h >= 30 && h <= 60) || (h >= 0 && h <= 30)) {
    return TerrainType.FARMLAND;
  }

  // Default to grass for unclassified areas
  return TerrainType.GRASS;
}

/**
 * Get flammability rating for terrain type
 */
export function getFlammability(terrain: TerrainType): number {
  switch (terrain) {
    case TerrainType.FOREST:
      return 0.8;
    case TerrainType.GRASS:
      return 0.6;
    case TerrainType.FARMLAND:
      return 0.4;
    case TerrainType.URBAN:
      return 0.2;
    case TerrainType.WATER:
      return 0.0;
    default:
      return 0.3;
  }
}

/**
 * Get terrain color for visualization
 */
export function getTerrainColor(terrain: TerrainType): string {
  switch (terrain) {
    case TerrainType.FOREST:
      return 'hsl(var(--terrain-forest))';
    case TerrainType.GRASS:
      return 'hsl(var(--terrain-grass))';
    case TerrainType.URBAN:
      return 'hsl(var(--terrain-urban))';
    case TerrainType.WATER:
      return 'hsl(var(--terrain-water))';
    case TerrainType.FARMLAND:
      return 'hsl(var(--terrain-farmland))';
    default:
      return 'hsl(var(--muted))';
  }
}