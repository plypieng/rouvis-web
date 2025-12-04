'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { googleMapsLoader } from '@/lib/google-maps';

interface Field {
  id: string;
  name: string;
  crop?: string;
  area_sqm?: number;
  geojson: any;
  created_at: string;
  updated_at: string;
}

interface FieldMapViewProps {
  fields: Field[];
}

export function FieldMapView({ fields }: FieldMapViewProps) {
  const t = useTranslations();
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [selectedField, setSelectedField] = useState<Field | null>(null);

  useEffect(() => {
    // Track all created map objects for proper cleanup
    let mapInstance: google.maps.Map | null = null;
    const mapElements: (google.maps.Polygon | google.maps.Marker)[] = [];

    // Get API key from environment variables
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      setMapError('Google Maps API key is not configured. Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your environment variables.');
      return;
    }

    const loader = googleMapsLoader;

    const initializeMap = async () => {
      try {
        await loader.load();

        if (!mapRef.current) return;

        // Niigata, Japan coordinates
        const niigata = { lat: 37.9161, lng: 139.0364 };

        mapInstance = new google.maps.Map(mapRef.current, {
          center: niigata,
          zoom: 15,
          mapTypeId: 'satellite',
          mapTypeControl: true,
          fullscreenControl: true,
          streetViewControl: false,
        });

        // Add GSI tiles as overlay
        const gsiTileLayer = new google.maps.ImageMapType({
          getTileUrl: (coord, zoom) => {
            const normalizedCoord = getNormalizedCoord(coord, zoom);
            if (!normalizedCoord) {
              return '';
            }
            return `https://cyberjapandata.gsi.go.jp/xyz/std/${zoom}/${normalizedCoord.x}/${normalizedCoord.y}.png`;
          },
          tileSize: new google.maps.Size(256, 256),
          maxZoom: 18,
          minZoom: 5,
          name: 'GSI',
        });

        mapInstance.overlayMapTypes.push(gsiTileLayer);

        // Add fields as polygons
        const cropColors = ['#4ade80', '#fbbf24', '#60a5fa', '#f87171', '#a78bfa'];

        fields.forEach((field, index) => {
          if (field.geojson && field.geojson.type === 'Polygon') {
            const coordinates: google.maps.LatLngLiteral[] = field.geojson.coordinates[0].map((coord: number[]) => ({
              lat: coord[1],
              lng: coord[0],
            }));

            const fieldPolygon = new google.maps.Polygon({
              paths: coordinates,
              strokeColor: cropColors[index % cropColors.length],
              strokeOpacity: 0.8,
              strokeWeight: 2,
              fillColor: cropColors[index % cropColors.length],
              fillOpacity: 0.35,
              editable: false,
            });

            fieldPolygon.setMap(mapInstance);
            mapElements.push(fieldPolygon);

            // Add click listener
            fieldPolygon.addListener('click', () => {
              setSelectedField(field);
            });

            // Add label marker at centroid
            const bounds = new google.maps.LatLngBounds();
            coordinates.forEach((coord: google.maps.LatLngLiteral) => bounds.extend(coord));
            const center = bounds.getCenter();

            const marker = new google.maps.Marker({
              position: center,
              map: mapInstance,
              label: {
                text: field.name,
                color: 'white',
                fontWeight: 'bold',
                fontSize: '12px',
              },
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 0,
              },
            });
            mapElements.push(marker);
          }
        });

        // Fit bounds to show all fields
        if (fields.length > 0) {
          const bounds = new google.maps.LatLngBounds();
          fields.forEach(field => {
            if (field.geojson && field.geojson.type === 'Polygon') {
              field.geojson.coordinates[0].forEach((coord: number[]) => {
                bounds.extend({ lat: coord[1], lng: coord[0] });
              });
            }
          });
          mapInstance.fitBounds(bounds);
        }

        setMapLoaded(true);
      } catch (e) {
        console.error('Error loading Google Maps API:', e);
        setMapError('Failed to load Google Maps. Please check your API key and internet connection.');
      }
    };

    initializeMap();

    // Cleanup function
    return () => {
      // Remove all map elements first
      mapElements.forEach(element => {
        if (element instanceof google.maps.Marker || element instanceof google.maps.Polygon) {
          element.setMap(null);
        }
      });

      // Let React properly manage the DOM
      if (mapRef.current && mapInstance) {
        // Allow React to handle the DOM cleanup
        mapInstance = null;
      }
    };
  }, [fields]);

  // Normalize coordinates for GSI tiles
  function getNormalizedCoord(coord: google.maps.Point, zoom: number) {
    const y = coord.y;
    let x = coord.x;

    // Repeat x coordinates
    const tileRange = 1 << zoom;
    if (x < 0 || x >= tileRange) {
      return null;
    }

    // Don't repeat y coordinates
    if (y < 0 || y >= tileRange) {
      return null;
    }

    return { x: x, y: y };
  }

  return (
    <div className="relative h-64 sm:h-96 w-full">
      <div
        ref={mapRef}
        className="w-full h-full rounded-lg border border-gray-200 bg-gray-100"
      >
        {mapError ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center p-4">
              <div className="text-red-500 mb-2">⚠️</div>
              <p className="text-sm text-gray-600">{mapError}</p>
            </div>
          </div>
        ) : !mapLoaded && (
          <div className="h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          </div>
        )}
      </div>

      {/* Field Info Panel */}
      {selectedField && (
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-sm border border-gray-200">
          <div className="flex items-start justify-between mb-3">
            <h3 className="font-semibold text-gray-900">{selectedField.name}</h3>
            <button
              onClick={() => setSelectedField(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2 text-sm">
            {selectedField.crop && (
              <div>
                <span className="font-medium text-gray-700">{t('fields.crop')}:</span>
                <span className="ml-2 text-gray-900">{selectedField.crop}</span>
              </div>
            )}

            {selectedField.area_sqm && (
              <div>
                <span className="font-medium text-gray-700">{t('fields.area')}:</span>
                <span className="ml-2 text-gray-900">
                  {selectedField.area_sqm >= 10000
                    ? `${(selectedField.area_sqm / 10000).toFixed(2)} ha`
                    : `${selectedField.area_sqm.toFixed(0)} m²`
                  }
                </span>
              </div>
            )}

            <div>
              <span className="font-medium text-gray-700">{t('fields.created')}:</span>
              <span className="ml-2 text-gray-900">
                {new Date(selectedField.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 border border-gray-200">
        <div className="text-xs font-medium text-gray-700 mb-2">{t('fields.legend')}</div>
        <div className="space-y-1">
          {fields.slice(0, 5).map((field, index) => (
            <div key={field.id} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: ['#4ade80', '#fbbf24', '#60a5fa', '#f87171', '#a78bfa'][index] }}
              ></div>
              <span className="text-xs text-gray-600">{field.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}