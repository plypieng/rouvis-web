'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { MapPin, Plus, Search, Filter, Grid, List } from 'lucide-react';
import { FieldCard } from './FieldCard';
import { FieldMapView } from './FieldMapView';
import { FieldCreateModal } from './FieldCreateModal';
import { FieldEditModal } from './FieldEditModal';
import { CropRotationPlanner } from './CropRotationPlanner';

interface Field {
  id: string;
  name: string;
  crop?: string;
  area_sqm?: number;
  geojson: any;
  created_at: string;
  updated_at: string;
}

interface FieldManagementPanelProps {
  className?: string;
}

export function FieldManagementPanel({ className }: FieldManagementPanelProps) {
  const t = useTranslations();
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid');
  const [selectedFieldForRotation, setSelectedFieldForRotation] = useState<Field | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingField, setEditingField] = useState<Field | null>(null);

  const fetchFields = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/v1/fields');
      if (!response.ok) {
        throw new Error('Failed to fetch fields');
      }
      const data = await response.json();
      setFields(data.fields || []);
    } catch (err) {
      console.error('Error fetching fields:', err);
      setError(t('fields.error_loading'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFields();
  }, []);

  const filteredFields = fields.filter((field) =>
    field.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (field.crop && field.crop.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleCreateField = async (fieldData: { name: string; geojson: any; crop?: string }) => {
    try {
      const response = await fetch('/api/v1/fields', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fieldData),
      });

      if (!response.ok) {
        throw new Error('Failed to create field');
      }

      await fetchFields(); // Refresh the list
      setShowCreateModal(false);
    } catch (err) {
      console.error('Error creating field:', err);
      throw err;
    }
  };

  const handleEditField = async (fieldId: string, fieldData: { name: string; geojson: any; crop?: string }) => {
    try {
      const response = await fetch(`/api/v1/fields/${fieldId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fieldData),
      });

      if (!response.ok) {
        throw new Error('Failed to update field');
      }

      await fetchFields(); // Refresh the list
      setEditingField(null);
    } catch (err) {
      console.error('Error updating field:', err);
      throw err;
    }
  };

  const handleDeleteField = async (fieldId: string) => {
    if (!confirm(t('common.delete_confirm'))) return;

    try {
      const response = await fetch(`/api/v1/fields/${fieldId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete field');
      }

      await fetchFields(); // Refresh the list
    } catch (err) {
      console.error('Error deleting field:', err);
      alert(t('common.error'));
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <MapPin className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              {t('fields.title')}
            </h2>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors w-full sm:w-auto justify-center"
          >
            <Plus className="w-4 h-4" />
            {t('fields.add_field')}
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              viewMode !== 'map' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t('fields.title')}
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              viewMode === 'map' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t('planner.interactive_map')}
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1 relative w-full sm:w-auto">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={t('fields.search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            <span className="ml-2 text-gray-600">{t('common.loading')}</span>
          </div>
        )}

        {error && (
          <div className="text-center py-12">
            <div className="text-red-600 mb-2">⚠️ {error}</div>
            <button
              onClick={fetchFields}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              {t('common.try_again')}
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            {viewMode === 'map' ? (
              <FieldMapView fields={filteredFields} />
            ) : (
              <div className="flex gap-6">
                {/* Fields List */}
                <div className="flex-1">
                  <div className={
                    viewMode === 'grid'
                      ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                      : 'space-y-4'
                  }>
                    {filteredFields.length === 0 ? (
                      <div className="col-span-full text-center py-12 text-gray-500">
                        {searchQuery ? t('fields.no_results') : t('fields.no_fields')}
                      </div>
                    ) : (
                      filteredFields.map((field) => (
                        <FieldCard
                          key={field.id}
                          field={field}
                          viewMode={viewMode}
                          onEdit={() => setEditingField(field)}
                          onDelete={() => handleDeleteField(field.id)}
                        />
                      ))
                    )}
                  </div>
                </div>

                {/* Crop Rotation Planner Sidebar */}
                <div className="w-96 hidden xl:block">
                  <CropRotationPlanner
                    fields={fields}
                    selectedField={selectedFieldForRotation}
                    onFieldSelect={setSelectedFieldForRotation}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <FieldCreateModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateField}
        />
      )}

      {editingField && (
        <FieldEditModal
          field={editingField}
          onClose={() => setEditingField(null)}
          onSubmit={(data) => handleEditField(editingField.id, data)}
        />
      )}
    </div>
  );
}