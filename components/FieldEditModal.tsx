'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { MapPin, X, Upload, Loader } from 'lucide-react';

interface Field {
  id: string;
  name: string;
  crop?: string;
  area_sqm?: number;
  geojson: any;
  created_at: string;
  updated_at: string;
}

interface FieldEditModalProps {
  field: Field;
  onClose: () => void;
  onSubmit: (data: { name: string; geojson: any; crop?: string }) => Promise<void>;
}

export function FieldEditModal({ field, onClose, onSubmit }: FieldEditModalProps) {
  const t = useTranslations();
  const [formData, setFormData] = useState({
    name: field.name,
    crop: field.crop || '',
    geojsonText: field.geojson ? JSON.stringify(field.geojson, null, 2) : '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError(t('fields.name_required'));
      return;
    }

    let geojson;
    try {
      if (formData.geojsonText.trim()) {
        geojson = JSON.parse(formData.geojsonText);
        // Basic validation for GeoJSON
        if (!geojson.type || geojson.type !== 'Polygon') {
          throw new Error('Invalid GeoJSON: Must be a Polygon');
        }
      }
    } catch (err) {
      setError(t('fields.invalid_geojson'));
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onSubmit({
        name: formData.name.trim(),
        geojson,
        crop: formData.crop.trim() || undefined,
      });
    } catch (err) {
      console.error('Error updating field:', err);
      setError(t('fields.update_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const geojson = JSON.parse(event.target?.result as string);
        setFormData(prev => ({
          ...prev,
          geojsonText: JSON.stringify(geojson, null, 2),
        }));
      } catch (err) {
        setError(t('fields.invalid_geojson_file'));
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <MapPin className="w-6 h-6 text-green-600" />
            <h3 className="text-xl font-semibold text-gray-900">
              {t('fields.edit_field')}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-red-800 text-sm">{error}</div>
            </div>
          )}

          {/* Field Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              {t('fields.field_name')} *
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder={t('fields.field_name_placeholder')}
              required
            />
          </div>

          {/* Crop */}
          <div>
            <label htmlFor="crop" className="block text-sm font-medium text-gray-700 mb-2">
              {t('fields.crop')} ({t('common.optional')})
            </label>
            <input
              type="text"
              id="crop"
              value={formData.crop}
              onChange={(e) => setFormData(prev => ({ ...prev, crop: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder={t('fields.crop_placeholder')}
            />
          </div>

          {/* GeoJSON */}
          <div>
            <label htmlFor="geojson" className="block text-sm font-medium text-gray-700 mb-2">
              {t('fields.geojson')} ({t('common.optional')})
            </label>
            <div className="space-y-3">
              {/* File Upload */}
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept=".json,.geojson"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="geojson-file"
                />
                <label
                  htmlFor="geojson-file"
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 cursor-pointer transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  {t('fields.upload_geojson')}
                </label>
                <span className="text-sm text-gray-500">
                  {t('fields.geojson_help')}
                </span>
              </div>

              {/* Text Area */}
              <textarea
                id="geojson"
                value={formData.geojsonText}
                onChange={(e) => setFormData(prev => ({ ...prev, geojsonText: e.target.value }))}
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm"
                placeholder={t('fields.geojson_placeholder')}
              />
            </div>
          </div>

          {/* Field Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">{t('fields.field_info')}</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">{t('fields.created')}:</span>
                <span className="ml-2 text-gray-900">
                  {new Date(field.created_at).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-gray-500">{t('fields.last_updated')}:</span>
                <span className="ml-2 text-gray-900">
                  {new Date(field.updated_at).toLocaleDateString()}
                </span>
              </div>
              {field.area_sqm && (
                <div>
                  <span className="text-gray-500">{t('fields.area')}:</span>
                  <span className="ml-2 text-gray-900">
                    {field.area_sqm >= 10000
                      ? `${(field.area_sqm / 10000).toFixed(2)} ha`
                      : `${field.area_sqm.toFixed(0)} m²`
                    }
                  </span>
                </div>
              )}
              <div>
                <span className="text-gray-500">ID:</span>
                <span className="ml-2 text-gray-900 font-mono text-xs">
                  {field.id.slice(0, 8)}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              disabled={loading}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader className="w-4 h-4 animate-spin" />
                  {t('common.loading')}
                </div>
              ) : (
                t('fields.update_field')
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}