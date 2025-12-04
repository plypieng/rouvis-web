'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { useTranslations } from 'next-intl';

interface Field {
  id: string;
  name: string;
  crop?: string;
  polygon?: any;
  location?: any;
  color?: string;
}

export function MapPlanner() {
  const t = useTranslations();
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [activeLayer, setActiveLayer] = useState<'satellite' | 'soil' | 'terrain'>('satellite');
  const [fields, setFields] = useState<Field[]>([]);

  // Fetch fields
  useEffect(() => {
    const fetchFields = async () => {
      try {
        const res = await fetch('/api/v1/fields');
        if (res.ok) {
          const data = await res.json();
          setFields(data.fields);
        }
      } catch (error) {
        console.error('Failed to fetch fields', error);
      }
    };
    fetchFields();
  }, []);

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

    const loader = new Loader({
      apiKey,
      version: 'weekly',
    });

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
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
        });

        // Add real fields
        const bounds = new google.maps.LatLngBounds();
        let hasValidBounds = false;

        fields.forEach((field) => {
          if (field.polygon) {
            let paths = field.polygon;
            if (typeof field.polygon === 'string') {
              try {
                paths = JSON.parse(field.polygon);
              } catch (e) {
                console.error('Error parsing polygon', e);
                return;
              }
            }

            const polygon = new google.maps.Polygon({
              paths: paths,
              strokeColor: field.color || '#10B981',
              strokeOpacity: 0.8,
              strokeWeight: 2,
              fillColor: field.color || '#10B981',
              fillOpacity: 0.35,
              map: mapInstance,
            });

            mapElements.push(polygon);

            // Extend bounds
            if (Array.isArray(paths)) {
              paths.forEach((p: any) => {
                bounds.extend(p);
                hasValidBounds = true;
              });
            }

            // Add label
            const polyBounds = new google.maps.LatLngBounds();
            if (Array.isArray(paths)) {
              paths.forEach((p: any) => polyBounds.extend(p));
              const center = polyBounds.getCenter();

              const marker = new google.maps.Marker({
                position: center,
                map: mapInstance,
                label: {
                  text: field.name,
                  color: 'white',
                  fontWeight: 'bold',
                  className: 'map-label-text shadow-sm'
                },
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 0,
                },
              });
              mapElements.push(marker);
            }
          }
        });

        if (hasValidBounds) {
          mapInstance.fitBounds(bounds);
        }

        setMapLoaded(true);
      } catch (e) {
        console.error('Error loading Google Maps API:', e);
        setMapError('Failed to load Google Maps. Please check your API key and internet connection.');
      }
    };

    initializeMap();

    // Cleanup function to remove all map elements when component unmounts
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
  }, [fields]); // Re-run when fields change

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveLayer('satellite')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg ${activeLayer === 'satellite'
                ? 'bg-primary-50 text-primary-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            {t('planner.satellite_view')}
          </button>
          <button
            onClick={() => setActiveLayer('soil')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg ${activeLayer === 'soil'
                ? 'bg-primary-50 text-primary-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            {t('planner.soil_analysis')}
          </button>
          <button
            onClick={() => setActiveLayer('terrain')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg ${activeLayer === 'terrain'
                ? 'bg-primary-50 text-primary-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            {t('planner.terrain')}
          </button>
        </div>
        <div className="space-x-2">
          <button className="px-3 py-1.5 text-sm font-medium bg-white border border-gray-300 rounded-lg">
            {t('planner.add_plot')}
          </button>
          <button className="px-3 py-1.5 text-sm font-medium bg-white border border-gray-300 rounded-lg">
            {t('planner.draw_area')}
          </button>
        </div>
      </div>

      <div
        ref={mapRef}
        className="flex-1 rounded-lg border border-gray-200 w-full h-full bg-gray-100"
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        )}
      </div>

      <div className="mt-4 text-sm text-gray-500">
        <p>
          <span className="font-medium">{t('planner.map_instructions')}:</span> {t('planner.map_instructions_text')}
        </p>
      </div>
    </div>
  );
}
