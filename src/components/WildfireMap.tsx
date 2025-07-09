import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { BoundingBox, GridData, SimulationParams, Cell, BurnState } from '../types/simulation';
import { getTilesForBounds } from '../utils/tileUtils';
import { classifyTerrain, getTerrainColor } from '../utils/terrainClassifier';
import { stepSimulation, igniteCell } from '../utils/cellularAutomata';
import { processAreaToGrid } from '../utils/tileProcessor';

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
  const leafletMapRef = useRef<L.Map | null>(null);
  const canvasLayerRef = useRef<L.Layer | null>(null);
  const selectionRectRef = useRef<L.Rectangle | null>(null);
  const [gridData, setGridData] = useState<GridData | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<L.LatLng | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return;

    const map = L.map(mapRef.current, {
      center: [37.7749, -122.4194], // San Francisco
      zoom: 10,
      zoomControl: true
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    leafletMapRef.current = map;

    // Handle map clicks for selection
    map.on('mousedown', (e) => {
      if (!isSimulationRunning) {
        setIsSelecting(true);
        setSelectionStart(e.latlng);
      }
    });

    map.on('mousemove', (e) => {
      if (isSelecting && selectionStart) {
        updateSelectionRect(selectionStart, e.latlng);
      }
    });

    map.on('mouseup', (e) => {
      if (isSelecting && selectionStart) {
        setIsSelecting(false);
        finalizeSelection(selectionStart, e.latlng);
        setSelectionStart(null);
      }
    });

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  // Update selection rectangle
  const updateSelectionRect = (start: L.LatLng, end: L.LatLng) => {
    if (!leafletMapRef.current) return;

    if (selectionRectRef.current) {
      leafletMapRef.current.removeLayer(selectionRectRef.current);
    }

    const bounds = L.latLngBounds(start, end);
    selectionRectRef.current = L.rectangle(bounds, {
      color: 'hsl(var(--primary))',
      fillColor: 'hsl(var(--primary))',
      fillOpacity: 0.2,
      weight: 2
    }).addTo(leafletMapRef.current);
  };

  // Finalize selection and start processing
  const finalizeSelection = async (start: L.LatLng, end: L.LatLng) => {
    const bounds: BoundingBox = {
      north: Math.max(start.lat, end.lat),
      south: Math.min(start.lat, end.lat),
      east: Math.max(start.lng, end.lng),
      west: Math.min(start.lng, end.lng)
    };

    onBoundsChange(bounds);
    await processSelectedArea(bounds);
  };

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
      
      // Add canvas overlay for visualization
      addCanvasOverlay(newGridData);

    } catch (error) {
      console.error('Error processing selected area:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Add canvas overlay for simulation visualization
  const addCanvasOverlay = (gridData: GridData) => {
    if (!leafletMapRef.current || canvasLayerRef.current) return;

    // Create a custom canvas layer using L.Layer
    class CustomCanvasLayer extends L.Layer {
      private canvas: HTMLCanvasElement | null = null;

      onAdd(map: L.Map) {
        this.canvas = document.createElement('canvas');
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.opacity = '0.7';
        
        const size = map.getSize();
        this.canvas.width = size.x;
        this.canvas.height = size.y;
        
        map.getPanes().overlayPane?.appendChild(this.canvas);
        this.redraw();
        
        map.on('zoomend moveend', this.redraw, this);
        return this;
      }

      onRemove(map: L.Map) {
        if (this.canvas && this.canvas.parentNode) {
          this.canvas.parentNode.removeChild(this.canvas);
        }
        map.off('zoomend moveend', this.redraw, this);
        return this;
      }

      redraw = () => {
        if (!this.canvas || !leafletMapRef.current) return;
        
        const map = leafletMapRef.current;
        const size = map.getSize();
        this.canvas.width = size.x;
        this.canvas.height = size.y;
        
        const ctx = this.canvas.getContext('2d');
        if (!ctx) return;
        
        // Clear canvas
        ctx.clearRect(0, 0, size.x, size.y);
        
        // Render grid
        this.renderGrid(ctx, gridData, map);
      };

      private renderGrid(ctx: CanvasRenderingContext2D, gridData: GridData, map: L.Map) {
        const bounds = gridData.bounds;
        const mapBounds = map.getBounds();
        
        // Calculate pixel size for each grid cell
        const topLeft = map.latLngToContainerPoint([bounds.north, bounds.west]);
        const bottomRight = map.latLngToContainerPoint([bounds.south, bounds.east]);
        
        const cellWidth = (bottomRight.x - topLeft.x) / gridData.width;
        const cellHeight = (bottomRight.y - topLeft.y) / gridData.height;

        for (let y = 0; y < gridData.height; y++) {
          for (let x = 0; x < gridData.width; x++) {
            const cell = gridData.cells[y][x];
            
            const pixelX = topLeft.x + x * cellWidth;
            const pixelY = topLeft.y + y * cellHeight;
            
            // Skip cells outside visible area
            if (pixelX + cellWidth < 0 || pixelX > map.getSize().x || 
                pixelY + cellHeight < 0 || pixelY > map.getSize().y) {
              continue;
            }
            
            let color = this.getTerrainColorRgb(cell.terrain);
            
            // Override with fire colors if burning/burned
            if (cell.burnState === BurnState.BURNING) {
              const intensity = cell.burnIntensity;
              const hue = 15 + intensity * 10;
              const sat = 85 + intensity * 10;
              const light = 45 + intensity * 20;
              color = this.hslToRgb(hue, sat, light);
            } else if (cell.burnState === BurnState.BURNED) {
              color = this.hslToRgb(20, 30, 25); // --fire-burned
            }

            ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
            ctx.fillRect(pixelX, pixelY, cellWidth, cellHeight);
          }
        }
      }

      private getTerrainColorRgb(terrain: any) {
        // Convert HSL to RGB for canvas rendering
        switch (terrain) {
          case 'FOREST': return this.hslToRgb(120, 40, 35);
          case 'GRASS': return this.hslToRgb(85, 45, 50);
          case 'URBAN': return this.hslToRgb(0, 0, 60);
          case 'WATER': return this.hslToRgb(200, 80, 50);
          case 'FARMLAND': return this.hslToRgb(45, 60, 65);
          default: return this.hslToRgb(0, 0, 70);
        }
      }

      private hslToRgb(h: number, s: number, l: number) {
        h = h / 360;
        s = s / 100;
        l = l / 100;
        
        const hue2rgb = (p: number, q: number, t: number) => {
          if (t < 0) t += 1;
          if (t > 1) t -= 1;
          if (t < 1/6) return p + (q - p) * 6 * t;
          if (t < 1/2) return q;
          if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
          return p;
        };

        let r, g, b;
        if (s === 0) {
          r = g = b = l;
        } else {
          const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
          const p = 2 * l - q;
          r = hue2rgb(p, q, h + 1/3);
          g = hue2rgb(p, q, h);
          b = hue2rgb(p, q, h - 1/3);
        }

        return {
          r: Math.round(r * 255),
          g: Math.round(g * 255),
          b: Math.round(b * 255)
        };
      }
    }

    canvasLayerRef.current = new CustomCanvasLayer();
    canvasLayerRef.current.addTo(leafletMapRef.current);
  };


  // Handle simulation step
  useEffect(() => {
    if (!isSimulationRunning || !gridData) return;

    const interval = setInterval(() => {
      setGridData(prevGrid => {
        if (!prevGrid) return null;
        
        const newGrid = stepSimulation(prevGrid, simulationParams);
        onGridDataChange(newGrid);
        
        // Update canvas visualization
        if (canvasLayerRef.current && leafletMapRef.current) {
          (canvasLayerRef.current as any).redraw();
        }
        
        return newGrid;
      });
    }, 500); // 500ms per step

    return () => clearInterval(interval);
  }, [isSimulationRunning, gridData, simulationParams]);

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
  }, [isSimulationRunning, gridData]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full rounded-lg overflow-hidden shadow-map" />
      {isSelecting && (
        <div className="absolute top-4 left-4 bg-card border rounded-lg px-3 py-2 shadow-panel">
          <p className="text-sm text-muted-foreground">
            Release to select area for simulation
          </p>
        </div>
      )}
      {gridData && !isSimulationRunning && (
        <div className="absolute top-4 left-4 bg-card border rounded-lg px-3 py-2 shadow-panel">
          <p className="text-sm text-muted-foreground">
            Grid: {gridData.width}×{gridData.height} cells
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