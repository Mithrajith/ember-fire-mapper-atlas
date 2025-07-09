import React, { useRef, useEffect } from 'react';
import L from 'leaflet';
import { GridData, BurnState } from '../types/simulation';

interface MapCanvasProps {
  leafletMapRef: React.RefObject<L.Map | null>;
  gridData: GridData | null;
}

export const MapCanvas: React.FC<MapCanvasProps> = ({ leafletMapRef, gridData }) => {
  const canvasLayerRef = useRef<L.Layer | null>(null);

  // Custom canvas layer class
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
      if (!this.canvas || !leafletMapRef.current || !gridData) return;
      
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

  // Add canvas overlay when gridData is available
  useEffect(() => {
    if (!leafletMapRef.current || !gridData) return;

    // Remove existing canvas layer
    if (canvasLayerRef.current) {
      leafletMapRef.current.removeLayer(canvasLayerRef.current);
    }

    // Add new canvas layer
    canvasLayerRef.current = new CustomCanvasLayer();
    canvasLayerRef.current.addTo(leafletMapRef.current);

    return () => {
      if (canvasLayerRef.current && leafletMapRef.current) {
        leafletMapRef.current.removeLayer(canvasLayerRef.current);
      }
    };
  }, [leafletMapRef, gridData]);

  // Redraw when gridData changes
  useEffect(() => {
    if (canvasLayerRef.current && leafletMapRef.current) {
      (canvasLayerRef.current as any).redraw();
    }
  }, [gridData]);

  return null; // This component doesn't render anything directly
};

export default MapCanvas;