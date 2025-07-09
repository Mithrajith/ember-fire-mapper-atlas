import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Play, Pause, Square, Flame, Wind, Thermometer, Droplets, CloudRain } from 'lucide-react';
import { SimulationParams, BoundingBox, GridData } from '../types/simulation';

interface ControlPanelProps {
  simulationParams: SimulationParams;
  onParamsChange: (params: SimulationParams) => void;
  selectedBounds: BoundingBox | null;
  gridData: GridData | null;
  isSimulationRunning: boolean;
  onStartSimulation: () => void;
  onPauseSimulation: () => void;
  onResetSimulation: () => void;
  onSaveConfig: () => void;
  onLoadConfig: (file: File) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  simulationParams,
  onParamsChange,
  selectedBounds,
  gridData,
  isSimulationRunning,
  onStartSimulation,
  onPauseSimulation,
  onResetSimulation,
  onSaveConfig,
  onLoadConfig
}) => {
  const updateParam = (key: keyof SimulationParams, value: number) => {
    onParamsChange({
      ...simulationParams,
      [key]: value
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onLoadConfig(file);
    }
  };

  const getFireStats = () => {
    if (!gridData) return { total: 0, burning: 0, burned: 0 };
    
    let total = 0;
    let burning = 0;
    let burned = 0;
    
    gridData.cells.forEach(row => {
      row.forEach(cell => {
        total++;
        if (cell.burnState === 'BURNING') burning++;
        if (cell.burnState === 'BURNED') burned++;
      });
    });
    
    return { total, burning, burned };
  };

  const stats = getFireStats();

  return (
    <div className="w-80 bg-background border-r border-border overflow-y-auto">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Wildfire Simulator</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cellular automata fire spread simulation
          </p>
        </div>

        {/* Selection Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Region Selection</CardTitle>
            <CardDescription>
              {selectedBounds ? 'Region selected' : 'Draw rectangle on map to select simulation area'}
            </CardDescription>
          </CardHeader>
          {selectedBounds && (
            <CardContent className="pt-0">
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">North:</span>
                  <span>{selectedBounds.north.toFixed(4)}°</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">South:</span>
                  <span>{selectedBounds.south.toFixed(4)}°</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">East:</span>
                  <span>{selectedBounds.east.toFixed(4)}°</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">West:</span>
                  <span>{selectedBounds.west.toFixed(4)}°</span>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Grid Configuration */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-terrain rounded"></div>
              Grid Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cell-size" className="text-sm font-medium">
                Cell Size: {simulationParams.gridCellSize} km
              </Label>
              <Slider
                id="cell-size"
                min={1}
                max={20}
                step={1}
                value={[simulationParams.gridCellSize]}
                onValueChange={(value) => updateParam('gridCellSize', value[0])}
                className="w-full"
              />
            </div>
            {gridData && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-center p-2 bg-muted rounded">
                  <div className="font-medium">{gridData.width}</div>
                  <div className="text-muted-foreground">Width</div>
                </div>
                <div className="text-center p-2 bg-muted rounded">
                  <div className="font-medium">{gridData.height}</div>
                  <div className="text-muted-foreground">Height</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Environmental Parameters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Wind className="w-4 h-4 text-accent" />
              Environmental Factors
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Wind Speed */}
            <div className="space-y-2">
              <Label htmlFor="wind-speed" className="text-sm font-medium flex items-center gap-2">
                <Wind className="w-3 h-3" />
                Wind Speed: {simulationParams.windSpeed} km/h
              </Label>
              <Slider
                id="wind-speed"
                min={0}
                max={100}
                step={5}
                value={[simulationParams.windSpeed]}
                onValueChange={(value) => updateParam('windSpeed', value[0])}
              />
            </div>

            {/* Wind Direction */}
            <div className="space-y-2">
              <Label htmlFor="wind-direction" className="text-sm font-medium">
                Wind Direction: {simulationParams.windDirection}°
              </Label>
              <Slider
                id="wind-direction"
                min={0}
                max={360}
                step={15}
                value={[simulationParams.windDirection]}
                onValueChange={(value) => updateParam('windDirection', value[0])}
              />
            </div>

            {/* Temperature */}
            <div className="space-y-2">
              <Label htmlFor="temperature" className="text-sm font-medium flex items-center gap-2">
                <Thermometer className="w-3 h-3" />
                Temperature: {simulationParams.temperature}°C
              </Label>
              <Slider
                id="temperature"
                min={-10}
                max={50}
                step={1}
                value={[simulationParams.temperature]}
                onValueChange={(value) => updateParam('temperature', value[0])}
              />
            </div>

            {/* Humidity */}
            <div className="space-y-2">
              <Label htmlFor="humidity" className="text-sm font-medium flex items-center gap-2">
                <Droplets className="w-3 h-3" />
                Humidity: {simulationParams.humidity}%
              </Label>
              <Slider
                id="humidity"
                min={0}
                max={100}
                step={5}
                value={[simulationParams.humidity]}
                onValueChange={(value) => updateParam('humidity', value[0])}
              />
            </div>

            {/* Rain Likelihood */}
            <div className="space-y-2">
              <Label htmlFor="rain" className="text-sm font-medium flex items-center gap-2">
                <CloudRain className="w-3 h-3" />
                Rain Likelihood: {simulationParams.rainLikelihood}%
              </Label>
              <Slider
                id="rain"
                min={0}
                max={100}
                step={5}
                value={[simulationParams.rainLikelihood]}
                onValueChange={(value) => updateParam('rainLikelihood', value[0])}
              />
            </div>
          </CardContent>
        </Card>

        {/* Simulation Controls */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Flame className="w-4 h-4 text-fire-active" />
              Simulation Control
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {!isSimulationRunning ? (
                <Button 
                  onClick={onStartSimulation}
                  disabled={!gridData}
                  className="flex items-center gap-2"
                  variant="default"
                >
                  <Play className="w-4 h-4" />
                  Start
                </Button>
              ) : (
                <Button 
                  onClick={onPauseSimulation}
                  className="flex items-center gap-2"
                  variant="secondary"
                >
                  <Pause className="w-4 h-4" />
                  Pause
                </Button>
              )}
              <Button 
                onClick={onResetSimulation}
                disabled={!gridData}
                className="flex items-center gap-2"
                variant="outline"
              >
                <Square className="w-4 h-4" />
                Reset
              </Button>
            </div>

            {/* Fire Statistics */}
            {gridData && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Fire Statistics</Label>
                <div className="grid grid-cols-3 gap-1 text-xs">
                  <div className="text-center p-2 bg-terrain-forest rounded">
                    <div className="font-medium text-white">{stats.total - stats.burning - stats.burned}</div>
                    <div className="text-terrain-forest-foreground">Unburned</div>
                  </div>
                  <div className="text-center p-2 bg-fire-burning rounded">
                    <div className="font-medium text-white">{stats.burning}</div>
                    <div className="text-fire-burning-foreground">Burning</div>
                  </div>
                  <div className="text-center p-2 bg-fire-burned rounded">
                    <div className="font-medium text-white">{stats.burned}</div>
                    <div className="text-fire-burned-foreground">Burned</div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Configuration Management */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Configuration</CardTitle>
            <CardDescription>Save and load simulation parameters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              onClick={onSaveConfig}
              variant="outline" 
              className="w-full"
            >
              Save Config
            </Button>
            <div className="relative">
              <Input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <Button variant="outline" className="w-full pointer-events-none">
                Load Config
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Terrain Legend */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Terrain Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-terrain-forest rounded"></div>
                <span>Forest (High flammability)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-terrain-grass rounded"></div>
                <span>Grassland (Medium flammability)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-terrain-farmland rounded"></div>
                <span>Farmland (Low flammability)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-terrain-urban rounded"></div>
                <span>Urban (Very low flammability)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-terrain-water rounded"></div>
                <span>Water (No flammability)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ControlPanel;