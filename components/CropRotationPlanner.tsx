'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { RotateCcw, Plus, Calendar, TrendingUp, AlertTriangle } from 'lucide-react';

interface Field {
  id: string;
  name: string;
  crop?: string;
  area_sqm?: number;
  geojson: any;
  created_at: string;
  updated_at: string;
}

interface CropRotation {
  id: string;
  fieldId: string;
  year: number;
  crop: string;
  startDate: string;
  endDate: string;
  notes?: string;
}

interface CropRotationPlannerProps {
  fields: Field[];
  selectedField?: Field | null;
  onFieldSelect?: (field: Field | null) => void;
  className?: string;
}

export function CropRotationPlanner({ fields, selectedField: externalSelectedField, onFieldSelect, className }: CropRotationPlannerProps) {
  const t = useTranslations();
  const [rotations, setRotations] = useState<CropRotation[]>([]);
  const [selectedField, setSelectedField] = useState<Field | null>(externalSelectedField || null);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [showAddModal, setShowAddModal] = useState(false);

  // Sync with external selected field
  useEffect(() => {
    if (externalSelectedField !== undefined) {
      setSelectedField(externalSelectedField);
    }
  }, [externalSelectedField]);

  const handleFieldSelect = (field: Field | null) => {
    setSelectedField(field);
    onFieldSelect?.(field);
  };

  // Mock data for demonstration - in real app, this would come from API
  useEffect(() => {
    const mockRotations: CropRotation[] = [
      {
        id: '1',
        fieldId: fields[0]?.id || '',
        year: 2024,
        crop: 'Rice',
        startDate: '2024-04-15',
        endDate: '2024-09-30',
        notes: 'Koshihikari variety'
      },
      {
        id: '2',
        fieldId: fields[0]?.id || '',
        year: 2025,
        crop: 'Soybeans',
        startDate: '2025-05-01',
        endDate: '2025-10-15',
        notes: 'Rotation to improve soil nitrogen'
      },
    ];
    setRotations(mockRotations);
  }, [fields]);

  const getCropColor = (crop: string) => {
    const colors: Record<string, string> = {
      'Rice': '#4ade80',
      'Soybeans': '#fbbf24',
      'Wheat': '#f87171',
      'Corn': '#60a5fa',
      'Vegetables': '#a78bfa',
    };
    return colors[crop] || '#6b7280';
  };

  const getRotationForFieldAndYear = (fieldId: string, year: number) => {
    return rotations.find(r => r.fieldId === fieldId && r.year === year);
  };

  const getRotationRecommendations = (field: Field) => {
    const currentRotation = getRotationForFieldAndYear(field.id, currentYear);
    const recommendations = [];

    if (!currentRotation) {
      recommendations.push({
        type: 'warning',
        message: t('rotation.no_plan_current_year'),
        action: t('rotation.plan_now')
      });
    }

    // Check for crop rotation best practices
    const lastYearCrop = getRotationForFieldAndYear(field.id, currentYear - 1)?.crop;
    if (lastYearCrop === currentRotation?.crop) {
      recommendations.push({
        type: 'warning',
        message: t('rotation.same_crop_warning'),
        action: t('rotation.change_crop')
      });
    }

    return recommendations;
  };

  const years = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <RotateCcw className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              {t('rotation.title')}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={currentYear}
              onChange={(e) => setCurrentYear(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t('rotation.add_plan')}
            </button>
          </div>
        </div>

        {/* Field Selector */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {fields.map(field => (
            <button
              key={field.id}
              onClick={() => handleFieldSelect(field)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                selectedField?.id === field.id
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {field.name}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {selectedField ? (
          <div className="space-y-6">
            {/* Field Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">{selectedField.name}</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {selectedField.crop && (
                  <div>
                    <span className="text-gray-500">{t('fields.current_crop')}:</span>
                    <span className="ml-2 text-gray-900">{selectedField.crop}</span>
                  </div>
                )}
                {selectedField.area_sqm && (
                  <div>
                    <span className="text-gray-500">{t('fields.area')}:</span>
                    <span className="ml-2 text-gray-900">
                      {selectedField.area_sqm >= 10000
                        ? `${(selectedField.area_sqm / 10000).toFixed(2)} ha`
                        : `${selectedField.area_sqm.toFixed(0)} m²`
                      }
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Recommendations */}
            {getRotationRecommendations(selectedField).length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  {t('rotation.recommendations')}
                </h4>
                {getRotationRecommendations(selectedField).map((rec, index) => (
                  <div key={index} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-yellow-800">{rec.message}</p>
                        <button className="text-sm text-yellow-700 underline mt-1">
                          {rec.action}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Rotation Timeline */}
            <div>
              <h4 className="font-medium text-gray-900 mb-4">{t('rotation.rotation_plan')}</h4>
              <div className="space-y-4">
                {years.map(year => {
                  const rotation = getRotationForFieldAndYear(selectedField.id, year);
                  return (
                    <div key={year} className="flex items-center gap-4">
                      <div className="w-16 text-sm font-medium text-gray-600">{year}</div>
                      <div className="flex-1">
                        {rotation ? (
                          <div className="bg-white border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-4 h-4 rounded"
                                  style={{ backgroundColor: getCropColor(rotation.crop) }}
                                ></div>
                                <div>
                                  <div className="font-medium text-gray-900">{rotation.crop}</div>
                                  <div className="text-sm text-gray-500">
                                    {new Date(rotation.startDate).toLocaleDateString()} - {new Date(rotation.endDate).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                              {rotation.notes && (
                                <div className="text-sm text-gray-600 max-w-xs truncate">
                                  {rotation.notes}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                            <div className="text-gray-500 text-sm">{t('rotation.no_plan')}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Benefits */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-900 mb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                {t('rotation.benefits_title')}
              </h4>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• {t('rotation.benefit_soil_health')}</li>
                <li>• {t('rotation.benefit_pest_control')}</li>
                <li>• {t('rotation.benefit_yield_stability')}</li>
                <li>• {t('rotation.benefit_nutrient_balance')}</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>{t('rotation.select_field')}</p>
          </div>
        )}
      </div>
    </div>
  );
}