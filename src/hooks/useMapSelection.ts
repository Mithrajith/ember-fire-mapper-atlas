import { useState, useRef, useEffect } from 'react';
import L from 'leaflet';
import { BoundingBox } from '../types/simulation';

interface UseMapSelectionProps {
  leafletMapRef: React.RefObject<L.Map | null>;
  isSimulationRunning: boolean;
  onBoundsChange: (bounds: BoundingBox | null) => void;
  onAreaSelected: (bounds: BoundingBox) => void;
}

export const useMapSelection = ({
  leafletMapRef,
  isSimulationRunning,
  onBoundsChange,
  onAreaSelected
}: UseMapSelectionProps) => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<L.LatLng | null>(null);
  const selectionRectRef = useRef<L.Rectangle | null>(null);

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
    onAreaSelected(bounds);
  };

  useEffect(() => {
    if (!leafletMapRef.current) return;

    const map = leafletMapRef.current;

    // Handle map clicks for selection
    const handleMouseDown = (e: L.LeafletMouseEvent) => {
      if (!isSimulationRunning) {
        setIsSelecting(true);
        setSelectionStart(e.latlng);
      }
    };

    const handleMouseMove = (e: L.LeafletMouseEvent) => {
      if (isSelecting && selectionStart) {
        updateSelectionRect(selectionStart, e.latlng);
      }
    };

    const handleMouseUp = (e: L.LeafletMouseEvent) => {
      if (isSelecting && selectionStart) {
        setIsSelecting(false);
        finalizeSelection(selectionStart, e.latlng);
        setSelectionStart(null);
      }
    };

    map.on('mousedown', handleMouseDown);
    map.on('mousemove', handleMouseMove);
    map.on('mouseup', handleMouseUp);

    return () => {
      map.off('mousedown', handleMouseDown);
      map.off('mousemove', handleMouseMove);
      map.off('mouseup', handleMouseUp);
    };
  }, [leafletMapRef, isSimulationRunning, isSelecting, selectionStart]);

  return { isSelecting };
};