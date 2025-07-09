import { BoundingBox, Cell, BurnState } from '../types/simulation';
import { getTilesForBounds, latLonToTile, tileToLatLon } from './tileUtils';
import { classifyTerrain } from './terrainClassifier';

/**
 * Process map tiles to create a classified terrain grid
 */
export async function processAreaToGrid(
  bounds: BoundingBox,
  cellSize: number,
  windSpeed: number,
  windDirection: number,
  temperature: number,
  humidity: number
): Promise<{ cells: Cell[][], width: number, height: number }> {
  // Calculate grid dimensions
  const latDiff = bounds.north - bounds.south;
  const lonDiff = bounds.east - bounds.west;
  
  // Approximate conversion from degrees to km
  const latKm = latDiff * 111;
  const lonKm = lonDiff * 111 * Math.cos((bounds.north + bounds.south) / 2 * Math.PI / 180);
  
  const gridWidth = Math.ceil(lonKm / cellSize);
  const gridHeight = Math.ceil(latKm / cellSize);

  // Get tiles for analysis - use zoom level 16 for high detail
  const tiles = getTilesForBounds(bounds, 16);
  
  // Create a canvas to analyze tile pixels
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create canvas context');

  // Load and process tiles
  const tileImages = await Promise.all(
    tiles.map(async (tile) => {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = tile.url;
        });
        return { ...tile, image: img };
      } catch (error) {
        console.warn(`Failed to load tile ${tile.url}:`, error);
        return null;
      }
    })
  );

  // Filter out failed tiles
  const validTiles = tileImages.filter(tile => tile !== null) as Array<{
    x: number;
    y: number;
    z: number;
    url: string;
    image: HTMLImageElement;
  }>;

  // Create grid cells
  const cells: Cell[][] = [];
  
  for (let y = 0; y < gridHeight; y++) {
    const row: Cell[] = [];
    for (let x = 0; x < gridWidth; x++) {
      // Calculate lat/lon for this grid cell center
      const cellLat = bounds.south + ((y + 0.5) / gridHeight) * latDiff;
      const cellLon = bounds.west + ((x + 0.5) / gridWidth) * lonDiff;
      
      // Get terrain classification by sampling the area
      const terrainType = await sampleTerrainAtLocation(
        cellLat,
        cellLon,
        validTiles,
        ctx,
        canvas
      );

      const cell: Cell = {
        terrain: terrainType,
        burnState: BurnState.UNBURNED,
        x,
        y,
        windX: windSpeed * Math.cos(windDirection * Math.PI / 180),
        windY: windSpeed * Math.sin(windDirection * Math.PI / 180),
        humidity,
        temperature,
        burnIntensity: 0,
        burnDuration: 0
      };

      row.push(cell);
    }
    cells.push(row);
  }

  return { cells, width: gridWidth, height: gridHeight };
}

/**
 * Sample terrain type at a specific lat/lon by analyzing nearby tile pixels
 */
async function sampleTerrainAtLocation(
  lat: number,
  lon: number,
  tiles: Array<{
    x: number;
    y: number;
    z: number;
    image: HTMLImageElement;
  }>,
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement
) {
  // Find the tile that contains this location
  const tileCoord = latLonToTile(lat, lon, 16);
  const tile = tiles.find(t => t.x === tileCoord.x && t.y === tileCoord.y);
  
  if (!tile) {
    // Default to grass if no tile found
    return classifyTerrain(120, 150, 80);
  }

  // Set canvas size to tile size
  canvas.width = tile.image.width;
  canvas.height = tile.image.height;
  
  // Draw the tile
  ctx.drawImage(tile.image, 0, 0);
  
  // Calculate pixel coordinates within the tile
  const tileTopLeft = tileToLatLon(tile.x, tile.y, 16);
  const tileBottomRight = tileToLatLon(tile.x + 1, tile.y + 1, 16);
  
  const pixelX = Math.floor(
    ((lon - tileTopLeft.lon) / (tileBottomRight.lon - tileTopLeft.lon)) * tile.image.width
  );
  const pixelY = Math.floor(
    ((tileTopLeft.lat - lat) / (tileTopLeft.lat - tileBottomRight.lat)) * tile.image.height
  );
  
  // Sample multiple pixels around the location for better classification
  const samples: { r: number; g: number; b: number }[] = [];
  const sampleSize = 3; // Sample a 3x3 area
  
  for (let dy = -sampleSize; dy <= sampleSize; dy++) {
    for (let dx = -sampleSize; dx <= sampleSize; dx++) {
      const sampleX = Math.max(0, Math.min(tile.image.width - 1, pixelX + dx));
      const sampleY = Math.max(0, Math.min(tile.image.height - 1, pixelY + dy));
      
      try {
        const imageData = ctx.getImageData(sampleX, sampleY, 1, 1);
        const data = imageData.data;
        samples.push({
          r: data[0],
          g: data[1],
          b: data[2]
        });
      } catch (error) {
        // Skip failed samples
        continue;
      }
    }
  }
  
  if (samples.length === 0) {
    // Fallback to default grass
    return classifyTerrain(120, 150, 80);
  }
  
  // Average the samples
  const avgR = samples.reduce((sum, s) => sum + s.r, 0) / samples.length;
  const avgG = samples.reduce((sum, s) => sum + s.g, 0) / samples.length;
  const avgB = samples.reduce((sum, s) => sum + s.b, 0) / samples.length;
  
  return classifyTerrain(Math.round(avgR), Math.round(avgG), Math.round(avgB));
}