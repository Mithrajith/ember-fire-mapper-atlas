import { Cell, BurnState, GridData, SimulationParams } from '../types/simulation';
import { getFlammability } from './terrainClassifier';

/**
 * Get neighboring cells (Moore neighborhood - 8 surrounding cells)
 */
function getNeighbors(grid: Cell[][], x: number, y: number): Cell[] {
  const neighbors: Cell[] = [];
  const directions = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1]
  ];

  for (const [dx, dy] of directions) {
    const nx = x + dx;
    const ny = y + dy;
    
    if (nx >= 0 && nx < grid[0].length && ny >= 0 && ny < grid.length) {
      neighbors.push(grid[ny][nx]);
    }
  }

  return neighbors;
}

/**
 * Calculate fire spread probability based on environmental factors
 */
function calculateSpreadProbability(
  fromCell: Cell,
  toCell: Cell,
  params: SimulationParams,
  windEffect: number
): number {
  // Base flammability of target terrain
  let probability = getFlammability(toCell.terrain);

  // Environmental modifiers
  const temperatureEffect = Math.max(0, (params.temperature - 20) / 50); // Normalized 0-1
  const humidityEffect = Math.max(0, (100 - params.humidity) / 100); // Normalized 0-1
  const rainEffect = Math.max(0, (100 - params.rainLikelihood) / 100); // Normalized 0-1

  probability *= (0.5 + 0.5 * temperatureEffect);
  probability *= humidityEffect;
  probability *= rainEffect;
  probability *= (0.8 + 0.4 * windEffect); // Wind boost

  // Fire intensity effect
  probability *= (0.5 + 0.5 * fromCell.burnIntensity);

  return Math.min(1.0, probability);
}

/**
 * Calculate wind effect based on direction from source to target
 */
function calculateWindEffect(fromX: number, fromY: number, toX: number, toY: number, windDirection: number): number {
  const fireDirection = Math.atan2(toY - fromY, toX - fromX) * 180 / Math.PI;
  const normalizedFireDir = (fireDirection + 360) % 360;
  const normalizedWindDir = (windDirection + 360) % 360;
  
  const angleDiff = Math.abs(normalizedWindDir - normalizedFireDir);
  const effectiveAngle = Math.min(angleDiff, 360 - angleDiff);
  
  // Wind effect ranges from 0.3 (opposite direction) to 1.0 (same direction)
  return 0.3 + 0.7 * Math.cos(effectiveAngle * Math.PI / 180);
}

/**
 * Update burn state for a single cell
 */
function updateCellBurnState(cell: Cell, neighbors: Cell[], params: SimulationParams): Cell {
  const newCell = { ...cell };

  switch (cell.burnState) {
    case BurnState.UNBURNED:
      // Check if fire spreads from burning neighbors
      for (const neighbor of neighbors) {
        if (neighbor.burnState === BurnState.BURNING) {
          const windEffect = calculateWindEffect(
            neighbor.x, neighbor.y, cell.x, cell.y, params.windDirection
          );
          
          const spreadProb = calculateSpreadProbability(neighbor, cell, params, windEffect);
          
          if (Math.random() < spreadProb * 0.1) { // Base spread rate per tick
            newCell.burnState = BurnState.BURNING;
            newCell.burnIntensity = Math.random() * 0.5 + 0.5; // Random intensity 0.5-1.0
            newCell.burnDuration = 0;
            break;
          }
        }
      }
      break;

    case BurnState.BURNING:
      newCell.burnDuration += 1;
      
      // Fire intensity decreases over time
      newCell.burnIntensity = Math.max(0, cell.burnIntensity - 0.05);
      
      // Fire burns out after duration based on terrain
      const burnoutDuration = getFlammability(cell.terrain) * 20 + 10; // 10-30 ticks
      if (newCell.burnDuration >= burnoutDuration || newCell.burnIntensity <= 0.1) {
        newCell.burnState = BurnState.BURNED;
        newCell.burnIntensity = 0;
      }
      break;

    case BurnState.BURNED:
      // Burned cells remain burned
      break;
  }

  return newCell;
}

/**
 * Advance the cellular automata simulation by one step
 */
export function stepSimulation(gridData: GridData, params: SimulationParams): GridData {
  const newGrid = gridData.cells.map(row => [...row]);

  // Update each cell based on its neighbors
  for (let y = 0; y < gridData.height; y++) {
    for (let x = 0; x < gridData.width; x++) {
      const cell = gridData.cells[y][x];
      const neighbors = getNeighbors(gridData.cells, x, y);
      newGrid[y][x] = updateCellBurnState(cell, neighbors, params);
    }
  }

  return {
    ...gridData,
    cells: newGrid
  };
}

/**
 * Initialize fire at specific coordinates
 */
export function igniteCell(gridData: GridData, x: number, y: number): GridData {
  if (x >= 0 && x < gridData.width && y >= 0 && y < gridData.height) {
    const newGrid = gridData.cells.map(row => [...row]);
    const cell = newGrid[y][x];
    
    if (cell.burnState === BurnState.UNBURNED && getFlammability(cell.terrain) > 0) {
      newGrid[y][x] = {
        ...cell,
        burnState: BurnState.BURNING,
        burnIntensity: 1.0,
        burnDuration: 0
      };
    }

    return {
      ...gridData,
      cells: newGrid
    };
  }

  return gridData;
}