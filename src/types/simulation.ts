export enum TerrainType {
  FOREST = 'FOREST',
  GRASS = 'GRASS',
  URBAN = 'URBAN',
  WATER = 'WATER',
  FARMLAND = 'FARMLAND'
}

export enum BurnState {
  UNBURNED = 'UNBURNED',
  BURNING = 'BURNING',
  BURNED = 'BURNED'
}

export interface Cell {
  terrain: TerrainType;
  burnState: BurnState;
  x: number;
  y: number;
  windX: number;
  windY: number;
  humidity: number;
  temperature: number;
  burnIntensity: number;
  burnDuration: number;
}

export interface SimulationParams {
  gridCellSize: number; // km
  windSpeed: number;
  windDirection: number; // degrees
  temperature: number; // celsius
  humidity: number; // percentage
  rainLikelihood: number; // percentage
}

export interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface TileInfo {
  x: number;
  y: number;
  z: number;
  url: string;
}

export interface GridData {
  cells: Cell[][];
  width: number;
  height: number;
  bounds: BoundingBox;
  cellSize: number;
}