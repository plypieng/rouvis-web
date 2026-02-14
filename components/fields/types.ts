export type RiskSeverity = 'safe' | 'watch' | 'warning' | 'critical';

export type FieldCentroid = {
  lat: number;
  lon: number;
};

export type GeoJsonPolygon = {
  type: 'Polygon';
  coordinates: number[][][];
};

export type FieldRecord = {
  id: string;
  name: string;
  crop?: string | null;
  color?: string | null;
  areaSqm?: number | null;
  geometry?: GeoJsonPolygon | null;
  centroid?: FieldCentroid | null;
  geoStatus?: 'verified' | 'approximate' | 'missing' | string;
  weatherSamplingMode?: 'centroid' | 'hybrid' | string;
  createdAt?: string;
  updatedAt?: string;
};
