import React, { useState, useCallback } from 'react';
import { toast } from 'sonner';
import WildfireMap from '../components/WildfireMap';
import ControlPanel from '../components/ControlPanel';
import { SimulationParams, BoundingBox, GridData } from '../types/simulation';

const Index = () => {
  const [simulationParams, setSimulationParams] = useState<SimulationParams>({
    gridCellSize: 5,
    windSpeed: 15,
    windDirection: 90,
    temperature: 25,
    humidity: 30,
    rainLikelihood: 10
  });

  const [selectedBounds, setSelectedBounds] = useState<BoundingBox | null>(null);
  const [gridData, setGridData] = useState<GridData | null>(null);
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);

  const handleBoundsChange = useCallback((bounds: BoundingBox | null) => {
    setSelectedBounds(bounds);
    if (!bounds) {
      setGridData(null);
      setIsSimulationRunning(false);
    }
  }, []);

  const handleGridDataChange = useCallback((data: GridData | null) => {
    setGridData(data);
  }, []);

  const handleStartSimulation = useCallback(() => {
    if (!gridData) {
      toast.error('Please select a region first');
      return;
    }
    setIsSimulationRunning(true);
    toast.success('Simulation started - click on map to ignite fires');
  }, [gridData]);

  const handlePauseSimulation = useCallback(() => {
    setIsSimulationRunning(false);
    toast.info('Simulation paused');
  }, []);

  const handleResetSimulation = useCallback(() => {
    setIsSimulationRunning(false);
    if (gridData) {
      // Reset all cells to unburned state
      const resetGrid = {
        ...gridData,
        cells: gridData.cells.map(row => 
          row.map(cell => ({
            ...cell,
            burnState: 'UNBURNED' as any,
            burnIntensity: 0,
            burnDuration: 0
          }))
        )
      };
      setGridData(resetGrid);
    }
    toast.info('Simulation reset');
  }, [gridData]);

  const handleSaveConfig = useCallback(() => {
    const config = {
      simulationParams,
      selectedBounds,
      timestamp: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(config, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wildfire-config-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Configuration saved');
  }, [simulationParams, selectedBounds]);

  const handleLoadConfig = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const config = JSON.parse(e.target?.result as string);
        if (config.simulationParams) {
          setSimulationParams(config.simulationParams);
          toast.success('Configuration loaded');
        }
        if (config.selectedBounds) {
          setSelectedBounds(config.selectedBounds);
        }
      } catch (error) {
        toast.error('Failed to load configuration');
      }
    };
    reader.readAsText(file);
  }, []);

  const handleCellClick = useCallback((x: number, y: number) => {
    toast.info(`Fire ignited at grid position (${x}, ${y})`);
  }, []);

  return (
    <div className="min-h-screen flex bg-background">
      <ControlPanel
        simulationParams={simulationParams}
        onParamsChange={setSimulationParams}
        selectedBounds={selectedBounds}
        gridData={gridData}
        isSimulationRunning={isSimulationRunning}
        onStartSimulation={handleStartSimulation}
        onPauseSimulation={handlePauseSimulation}
        onResetSimulation={handleResetSimulation}
        onSaveConfig={handleSaveConfig}
        onLoadConfig={handleLoadConfig}
      />
      <div className="flex-1 p-6">
        <WildfireMap
          onBoundsChange={handleBoundsChange}
          simulationParams={simulationParams}
          onGridDataChange={handleGridDataChange}
          isSimulationRunning={isSimulationRunning}
          onCellClick={handleCellClick}
        />
      </div>
    </div>
  );
};

export default Index;
