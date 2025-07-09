import { useEffect } from 'react';
import L from 'leaflet';
import { GridData, SimulationParams, BurnState } from '../types/simulation';
import { stepSimulation, igniteCell } from '../utils/cellularAutomata';

interface UseSimulationProps {
  isSimulationRunning: boolean;
  gridData: GridData | null;
  simulationParams: SimulationParams;
  leafletMapRef: React.RefObject<L.Map | null>;
  onGridDataChange: (gridData: GridData | null) => void;
  onCellClick: (x: number, y: number) => void;
  setGridData: (gridData: GridData | null) => void;
}

export const useSimulation = ({
  isSimulationRunning,
  gridData,
  simulationParams,
  leafletMapRef,
  onGridDataChange,
  onCellClick,
  setGridData
}: UseSimulationProps) => {

  // Handle simulation step
  useEffect(() => {
    if (!isSimulationRunning || !gridData) return;

    const interval = setInterval(() => {
      if (!gridData) return;
      
      const newGrid = stepSimulation(gridData, simulationParams);
      setGridData(newGrid);
      onGridDataChange(newGrid);
    }, 500); // 500ms per step

    return () => clearInterval(interval);
  }, [isSimulationRunning, gridData, simulationParams, onGridDataChange, setGridData]);

  // Handle cell clicks for ignition
  const handleMapClick = (e: L.LeafletMouseEvent) => {
    if (!gridData || !isSimulationRunning) return;

    // Convert map coordinates to grid coordinates
    const bounds = gridData.bounds;
    const relativeX = (e.latlng.lng - bounds.west) / (bounds.east - bounds.west);
    const relativeY = 1 - (e.latlng.lat - bounds.south) / (bounds.north - bounds.south);
    
    const gridX = Math.floor(relativeX * gridData.width);
    const gridY = Math.floor(relativeY * gridData.height);

    if (gridX >= 0 && gridX < gridData.width && gridY >= 0 && gridY < gridData.height) {
      const newGrid = igniteCell(gridData, gridX, gridY);
      setGridData(newGrid);
      onGridDataChange(newGrid);
      onCellClick(gridX, gridY);
    }
  };

  // Add click handler for ignition
  useEffect(() => {
    if (!leafletMapRef.current) return;

    if (isSimulationRunning && gridData) {
      leafletMapRef.current.on('click', handleMapClick);
    } else {
      leafletMapRef.current.off('click', handleMapClick);
    }

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.off('click', handleMapClick);
      }
    };
  }, [isSimulationRunning, gridData, leafletMapRef]);
};