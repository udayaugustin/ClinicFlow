import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../../styles/leaflet.css';

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface LeafletMapProps {
  center?: [number, number];
  zoom?: number;
  height?: string;
  showCurrentLocation?: boolean;
  currentLocation?: [number, number];
  hospitals?: Array<{
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    address?: string;
    rating?: number;
    distance?: number;
    phone?: string;
    openingHours?: string | null;
  }>;
  onMapReady?: (map: L.Map) => void;
}

export function LeafletMap({
  center = [13.0827, 80.2707], // Default to Chennai center
  zoom = 12,
  height = '400px',
  showCurrentLocation = false,
  currentLocation,
  hospitals = [],
  onMapReady
}: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize map
    const map = L.map(mapRef.current).setView(center, zoom);

    // Add CartoDB Positron (Light Grey) tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(map);

    // Store map instance
    mapInstanceRef.current = map;

    // Add current location marker if provided
    if (showCurrentLocation && currentLocation) {
      const currentLocationIcon = L.divIcon({
        className: 'current-location-marker',
        html: '<div style="width: 16px; height: 16px; background-color: #3b82f6; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>',
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      L.marker(currentLocation, { icon: currentLocationIcon })
        .addTo(map)
        .bindPopup(`
          <div style="text-align: center; min-width: 150px;">
            <div style="font-weight: bold; color: #1f2937; margin-bottom: 4px;">📍 Your Location</div>
            <div style="font-size: 12px; color: #6b7280;">
              ${currentLocation[0].toFixed(6)}, ${currentLocation[1].toFixed(6)}
            </div>
          </div>
        `);

      // Center map on current location if provided
      map.setView(currentLocation, zoom);
    }

    // Add hospital markers
    hospitals.forEach((hospital) => {
      const hospitalIcon = L.divIcon({
        className: 'hospital-marker',
        html: `
          <div style="
            width: 24px; 
            height: 24px; 
            background-color: #dc2626; 
            border: 2px solid white; 
            border-radius: 4px; 
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            color: white;
            font-weight: bold;
          ">
            ⚕
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const popupContent = `
        <div style="min-width: 220px;">
          <div style="font-weight: bold; color: #1f2937; margin-bottom: 8px; font-size: 14px;">
            🏥 ${hospital.name}
          </div>
          ${hospital.address ? `
            <div style="color: #6b7280; font-size: 12px; margin-bottom: 4px;">
              📍 ${hospital.address}
            </div>
          ` : ''}
          ${hospital.distance ? `
            <div style="color: #059669; font-size: 12px; margin-bottom: 4px; font-weight: 500;">
              📏 ${hospital.distance.toFixed(1)} km away
            </div>
          ` : ''}
          ${hospital.phone ? `
            <div style="color: #6b7280; font-size: 12px; margin-bottom: 4px;">
              📞 ${hospital.phone}
            </div>
          ` : ''}
          ${hospital.openingHours ? `
            <div style="color: #6b7280; font-size: 12px; margin-bottom: 8px;">
              🕒 ${hospital.openingHours}
            </div>
          ` : ''}
          ${hospital.rating ? `
            <div style="color: #f59e0b; font-size: 12px; margin-bottom: 8px;">
              ⭐ ${hospital.rating}/5
            </div>
          ` : ''}
          <div style="margin-top: 8px; display: flex; gap: 4px;">
            <button style="
              background-color: #3b82f6;
              color: white;
              border: none;
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 11px;
              cursor: pointer;
              flex: 1;
            " onclick="alert('Find doctors at ${hospital.name}')">
              Find Doctors
            </button>
            ${hospital.phone ? `
              <button style="
                background-color: #10b981;
                color: white;
                border: none;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 11px;
                cursor: pointer;
                flex: 1;
              " onclick="window.open('tel:${hospital.phone}')">
                Call Now
              </button>
            ` : ''}
          </div>
        </div>
      `;

      L.marker([hospital.latitude, hospital.longitude], { icon: hospitalIcon })
        .addTo(map)
        .bindPopup(popupContent);
    });

    // Call onMapReady callback
    if (onMapReady) {
      onMapReady(map);
    }

    // Cleanup function
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [center, zoom, showCurrentLocation, currentLocation, hospitals, onMapReady]);

  return (
    <div 
      ref={mapRef} 
      style={{ 
        height, 
        width: '100%',
        borderRadius: '8px',
        border: '1px solid #e5e7eb'
      }} 
      className="leaflet-map-container"
    />
  );
}

// Custom hook to get map instance
export function useLeafletMap() {
  const mapRef = useRef<L.Map | null>(null);
  
  const setMapInstance = (map: L.Map) => {
    mapRef.current = map;
  };

  const getMapInstance = () => mapRef.current;

  return {
    setMapInstance,
    getMapInstance
  };
}