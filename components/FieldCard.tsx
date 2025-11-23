'use client';

import { useTranslations } from 'next-intl';
import { MapPin, Edit, Trash2, Crop, Square } from 'lucide-react';

interface Field {
  id: string;
  name: string;
  crop?: string;
  area_sqm?: number;
  geojson: any;
  created_at: string;
  updated_at: string;
}

interface FieldCardProps {
  field: Field;
  viewMode: 'grid' | 'list';
  onEdit: () => void;
  onDelete: () => void;
}

export function FieldCard({ field, viewMode, onEdit, onDelete }: FieldCardProps) {
  const t = useTranslations();

  const formatArea = (area?: number) => {
    if (!area) return '';
    if (area >= 10000) {
      return `${(area / 10000).toFixed(2)} ha`;
    }
    return `${area.toFixed(0)} m²`;
  };

  const formatDate = (dateString: string) => {
    // Deterministic, locale-agnostic to avoid SSR/CSR hydration mismatch
    // Prefer the ISO date part and render as YYYY/MM/DD
    if (!dateString) return '';
    const iso = dateString.includes('T') ? dateString : new Date(dateString).toISOString();
    const ymd = iso.slice(0, 10); // YYYY-MM-DD
    return ymd.replace(/-/g, '/');
  };

  if (viewMode === 'list') {
    return (
      <div className="mobile-card hover:shadow-md transition-shadow mobile-tap">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <MapPin className="w-6 h-6 text-green-600 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-gray-900 text-mobile-lg truncate">{field.name}</h3>
              <p className="text-mobile-sm text-gray-500">
                {t('fields.created')}: {formatDate(field.created_at)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={onEdit}
              className="touch-target text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors mobile-tap"
              title={t('common.edit')}
              aria-label={`${t('common.edit')} ${field.name}`}
            >
              <Edit className="w-5 h-5" />
            </button>
            <button
              onClick={onDelete}
              className="touch-target text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors mobile-tap"
              title={t('common.delete')}
              aria-label={`${t('common.delete')} ${field.name}`}
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {field.crop && (
            <div className="flex items-center gap-2">
              <Crop className="w-4 h-4 text-green-600 flex-shrink-0" />
              <span className="text-mobile-sm font-medium text-gray-700">{t('fields.crop')}:</span>
              <span className="text-mobile-sm text-gray-900 truncate">{field.crop}</span>
            </div>
          )}

          {field.area_sqm && (
            <div className="flex items-center gap-2">
              <Square className="w-4 h-4 text-green-600 flex-shrink-0" />
              <span className="text-mobile-sm font-medium text-gray-700">{t('fields.area')}:</span>
              <span className="text-mobile-sm text-gray-900">{formatArea(field.area_sqm)}</span>
            </div>
          )}

          <div className="pt-3 border-t border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-mobile-sm text-gray-500">
              <span className="truncate">{t('fields.last_updated')}: {formatDate(field.updated_at)}</span>
              <span className="font-mono">ID: {field.id.slice(0, 8)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <MapPin className="w-6 h-6 text-green-600" />
          <div>
            <h3 className="font-semibold text-gray-900 text-base sm:text-lg">{field.name}</h3>
            <p className="text-sm text-gray-500">
              {t('fields.created')}: {formatDate(field.created_at)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title={t('common.edit')}
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title={t('common.delete')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {field.crop && (
          <div className="flex items-center gap-2">
            <Crop className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-gray-700">{t('fields.crop')}:</span>
            <span className="text-sm text-gray-900">{field.crop}</span>
          </div>
        )}

        {field.area_sqm && (
          <div className="flex items-center gap-2">
            <Square className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-gray-700">{t('fields.area')}:</span>
            <span className="text-sm text-gray-900">{formatArea(field.area_sqm)}</span>
          </div>
        )}

        <div className="pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{t('fields.last_updated')}: {formatDate(field.updated_at)}</span>
            <span>ID: {field.id.slice(0, 8)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}