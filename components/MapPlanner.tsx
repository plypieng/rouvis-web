'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { useTranslations } from 'next-intl';

export function MapPlanner() {
  const t = useTranslations();
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [activeLayer, setActiveLayer] = useState<'satellite' | 'soil' | 'terrain'>('satellite');

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

        // Add farm plot outlines (mock data for demonstration)
        const farmPlots = [
          [
            { lat: 37.9161, lng: 139.0364 },
            { lat: 37.9171, lng: 139.0374 },
            { lat: 37.9181, lng: 139.0364 },
            { lat: 37.9171, lng: 139.0354 },
          ],
          [
            { lat: 37.9141, lng: 139.0344 },
            { lat: 37.9151, lng: 139.0354 },
            { lat: 37.9161, lng: 139.0344 },
            { lat: 37.9151, lng: 139.0334 },
          ],
          [
            { lat: 37.9131, lng: 139.0384 },
            { lat: 37.9141, lng: 139.0394 },
            { lat: 37.9151, lng: 139.0384 },
            { lat: 37.9141, lng: 139.0374 },
          ],
        ];

        // Add the polygons to the map
        const cropColors = ['#4ade80', '#fbbf24', '#60a5fa'];
        const cropNames = [
          t('planner.crop_names.rice_field_a'),
          t('planner.crop_names.vegetable_garden'),
          t('planner.crop_names.rice_field_b')
        ];
        
        farmPlots.forEach((plotCoords, index) => {
          const farmPlot = new google.maps.Polygon({
            paths: plotCoords,
            strokeColor: cropColors[index],
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: cropColors[index],
            fillOpacity: 0.35,
            editable: true,
          });
          
          farmPlot.setMap(mapInstance);
          mapElements.push(farmPlot);
          
          // Add a label to each plot
          const bounds = new google.maps.LatLngBounds();
          plotCoords.forEach(coord => bounds.extend(coord));
          const center = bounds.getCenter();
          
          const marker = new google.maps.Marker({
            position: center,
            map: mapInstance,
            label: {
              text: cropNames[index],
              color: 'black',
              fontWeight: 'bold',
            },
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 0,
            },
          });
          mapElements.push(marker);
        });

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
  }, []);

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveLayer('satellite')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg ${
              activeLayer === 'satellite'
                ? 'bg-primary-50 text-primary-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t('planner.satellite_view')}
          </button>
          <button
            onClick={() => setActiveLayer('soil')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg ${
              activeLayer === 'soil'
                ? 'bg-primary-50 text-primary-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t('planner.soil_analysis')}
          </button>
          <button
            onClick={() => setActiveLayer('terrain')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg ${
              activeLayer === 'terrain'
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
