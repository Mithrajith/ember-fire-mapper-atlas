import React, { useRef, useState } from 'react';
import { BoundingBox, GridData, SimulationParams } from '../types/simulation';
import { processAreaToGrid } from '../utils/tileProcessor';
import { useMapSetup } from '../hooks/useMapSetup';
import { useMapSelection } from '../hooks/useMapSelection';
import { useSimulation } from '../hooks/useSimulation';
import MapCanvas from './MapCanvas';

interface WildfireMapProps {
  onBoundsChange: (bounds: BoundingBox | null) => void;
  simulationParams: SimulationParams;
  onGridDataChange: (gridData: GridData | null) => void;
  isSimulationRunning: boolean;
  onCellClick: (x: number, y: number) => void;
}

const WildfireMap: React.FC<WildfireMapProps> = ({
  onBoundsChange,
  simulationParams,
  onGridDataChange,
  isSimulationRunning,
  onCellClick
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [gridData, setGridData] = useState<GridData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize map
  const leafletMapRef = useMapSetup(mapRef);

  // Process selected area and create grid
  const processSelectedArea = async (bounds: BoundingBox) => {
    try {
      setIsProcessing(true);
      
      // Use the new tile processor to create classified grid
      const { cells, width, height } = await processAreaToGrid(
        bounds,
        simulationParams.gridCellSize,
        simulationParams.windSpeed,
        simulationParams.windDirection,
        simulationParams.temperature,
        simulationParams.humidity
      );

      const newGridData: GridData = {
        cells,
        width,
        height,
        bounds,
        cellSize: simulationParams.gridCellSize
      };

      setGridData(newGridData);
      onGridDataChange(newGridData);

    } catch (error) {
      console.error('Error processing selected area:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle area selection
  const { isSelecting } = useMapSelection({
    leafletMapRef,
    isSimulationRunning,
    onBoundsChange,
    onAreaSelected: processSelectedArea
  });

  // Handle simulation logic
  useSimulation({
    isSimulationRunning,
    gridData,
    simulationParams,
    leafletMapRef,
    onGridDataChange,
    onCellClick,
    setGridData
  });

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full rounded-lg overflow-hidden shadow-map" />
      
      <MapCanvas leafletMapRef={leafletMapRef} gridData={gridData} />
      
      {isSelecting && (
        <div className="absolute top-4 left-4 bg-card border rounded-lg px-3 py-2 shadow-panel">
          <p className="text-sm text-muted-foreground">
            Release to select area for simulation
          </p>
        </div>
      )}
      
      {isProcessing && (
        <div className="absolute top-4 left-4 bg-card border rounded-lg px-3 py-2 shadow-panel">
          <p className="text-sm text-muted-foreground">
            Processing area and classifying terrain...
          </p>
        </div>
      )}
      
      {gridData && !isSimulationRunning && !isProcessing && (
        <div className="absolute top-4 left-4 bg-card border rounded-lg px-3 py-2 shadow-panel">
          <p className="text-sm text-muted-foreground">
            Grid: {gridData.width}×{gridData.height} cells
          </p>
        </div>
      )}
      
      {isSimulationRunning && (
        <div className="absolute top-4 left-4 bg-card border rounded-lg px-3 py-2 shadow-panel">
          <p className="text-sm text-fire-active font-medium">
            Click on map to ignite fires
          </p>
        </div>
      )}
    </div>
  );
};

export default WildfireMap;