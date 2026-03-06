'use client';

import { useCallback, useEffect, useState } from 'react';
import { MapPin, Search, Check, X } from 'lucide-react';

interface Field {
  id: string;
  name: string;
  crop?: string;
  area?: number;
  location?: string;
}

interface FieldSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (field: Field) => void;
  selectedFieldId?: string;
  fields?: Field[];
  onFetchFields?: () => Promise<Field[]>;
}

export function FieldSelector({
  isOpen,
  onClose,
  onSelect,
  selectedFieldId,
  fields: initialFields,
  onFetchFields,
}: FieldSelectorProps) {
  const [fields, setFields] = useState<Field[]>(initialFields || []);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadFields = useCallback(async () => {
    if (!onFetchFields) return;

    setLoading(true);
    setError(null);

    try {
      const nextFields = await onFetchFields();
      setFields(nextFields);
    } catch (err) {
      console.error('Failed to fetch fields:', err);
      setError('圃場の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  }, [onFetchFields]);

  useEffect(() => {
    if (isOpen && !initialFields && onFetchFields) {
      const timer = window.setTimeout(() => {
        void loadFields();
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [isOpen, initialFields, onFetchFields, loadFields]);

  const filteredFields = fields.filter((field) =>
    field.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (field.crop && field.crop.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (field.location && field.location.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">圃場を選択</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="圃場名や作物で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto max-h-96">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              <span className="ml-2 text-gray-600">読み込み中...</span>
            </div>
          )}

          {error && (
            <div className="p-4 text-center">
              <div className="text-red-600 mb-2">⚠️ {error}</div>
              <button
                onClick={() => {
                  void loadFields();
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                再試行
              </button>
            </div>
          )}

          {!loading && !error && filteredFields.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              {searchQuery ? '検索結果が見つかりません' : '圃場が登録されていません'}
            </div>
          )}

          {!loading && !error && filteredFields.map((field) => (
            <div
              key={field.id}
              onClick={() => {
                onSelect(field);
                onClose();
              }}
              className={`
                p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors
                ${selectedFieldId === field.id ? 'bg-green-50 border-green-200' : ''}
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">{field.name}</span>
                    {selectedFieldId === field.id && (
                      <Check className="w-4 h-4 text-green-600" />
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    {field.crop && (
                      <span className="flex items-center gap-1">
                        🌾 {field.crop}
                      </span>
                    )}
                    {field.area && (
                      <span className="flex items-center gap-1">
                        📏 {field.area}㎡
                      </span>
                    )}
                    {field.location && (
                      <span className="flex items-center gap-1">
                        📍 {field.location}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              キャンセル
            </button>
            {selectedFieldId && (
              <button
                onClick={() => {
                  const selectedField = fields.find(f => f.id === selectedFieldId);
                  if (selectedField) {
                    onSelect(selectedField);
                    onClose();
                  }
                }}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                選択
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
