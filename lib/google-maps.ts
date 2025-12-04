import { Loader } from '@googlemaps/js-api-loader';

const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

export const googleMapsLoader = new Loader({
    apiKey,
    version: 'weekly',
    libraries: ['drawing', 'geometry', 'places'],
});
