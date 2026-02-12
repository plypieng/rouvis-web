'use client';

import { useState, useEffect } from 'react';
import { X, Save, MapPin, Calendar } from 'lucide-react';
import { toastError, toastSuccess } from '@/lib/feedback';

interface Field {
  id: string;
  name: string;
  crop?: string;
  area?: number;
}

interface ActivityLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (activity: {
    fieldId?: string;
    type: string;
    quantity?: number;
    unit?: string;
    note?: string;
    performedAt?: string;
  }) => Promise<void>;
  initialFieldId?: string;
}

const ACTIVITY_TYPES = [
  { value: 'watering', label: '水やり', icon: '💧', units: ['L', 'm³'] },
  { value: 'fertilizing', label: '肥料投入', icon: '🌱', units: ['kg', 'g', 'L'] },
  { value: 'harvesting', label: '収穫', icon: '🚜', units: ['kg', '個', '束'] },
  { value: 'planting', label: '植え付け', icon: '🌾', units: ['個', 'm²', '穴'] },
  { value: 'weeding', label: '除草', icon: '🌿', units: ['m²', '時間'] },
  { value: 'pesticide_application', label: '農薬散布', icon: '🧪', units: ['L', 'kg', 'm²'] },
  { value: 'pruning', label: '剪定', icon: '✂️', units: ['本', '時間'] },
  { value: 'other', label: 'その他', icon: '⚡', units: [] },
];

export function ActivityLogModal({
  isOpen,
  onClose,
  onSave,
  initialFieldId,
}: ActivityLogModalProps) {
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fieldId: initialFieldId || '',
    type: 'watering',
    quantity: '',
    unit: '',
    note: '',
    performedAt: new Date().toISOString().slice(0, 16), // YYYY-MM-DDTHH:MM format
  });

  useEffect(() => {
    if (isOpen) {
      fetchFields();
      setErrorMessage(null);
      setFormData(prev => ({
        ...prev,
        fieldId: initialFieldId || '',
        performedAt: new Date().toISOString().slice(0, 16),
      }));
    }
  }, [isOpen, initialFieldId]);

  const fetchFields = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/fields');
      if (response.ok) {
        const data = await response.json();
        setFields(data.fields || []);
      }
    } catch (error) {
      console.error('Failed to fetch fields:', error);
    } finally {
      setLoading(false);
    }
  };

  const submitActivity = async () => {
    if (!formData.type) {
      const message = '活動タイプを選択してください';
      setErrorMessage(message);
      toastError(message);
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    try {
      await onSave({
        fieldId: formData.fieldId || undefined,
        type: formData.type,
        quantity: formData.quantity ? parseFloat(formData.quantity) : undefined,
        unit: formData.unit || undefined,
        note: formData.note || undefined,
        performedAt: formData.performedAt,
      });

      // Reset form
      setFormData({
        fieldId: '',
        type: 'watering',
        quantity: '',
        unit: '',
        note: '',
        performedAt: new Date().toISOString().slice(0, 16),
      });

      onClose();
      toastSuccess('活動を保存しました。');
    } catch (error) {
      console.error('Failed to save activity:', error);
      const message = error instanceof Error ? error.message : '活動の保存に失敗しました';
      setErrorMessage(message);
      toastError(message, {
        label: '再試行',
        onClick: () => {
          void submitActivity();
        },
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitActivity();
  };

  const selectedActivityType = ACTIVITY_TYPES.find(type => type.value === formData.type);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 safe-top safe-bottom p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto mobile-scroll">
        {/* Header - Mobile optimized */}
        <div className="flex items-center justify-between mobile-spacing border-b">
          <h2 className="text-mobile-lg font-semibold text-gray-900">活動を記録</h2>
          <button
            onClick={onClose}
            className="touch-target hover:bg-gray-100 rounded-full transition-colors mobile-tap"
            aria-label="閉じる"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form - Mobile optimized */}
        <form onSubmit={handleSubmit} className="mobile-spacing space-y-4">
          {errorMessage && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <div className="flex items-center justify-between gap-3">
                <span>{errorMessage}</span>
                <button
                  type="button"
                  onClick={() => { void submitActivity(); }}
                  className="rounded-md border border-current px-2 py-1 text-xs font-semibold hover:bg-white/40"
                  disabled={saving}
                >
                  再試行
                </button>
              </div>
            </div>
          )}

          {/* Field Selection - Mobile optimized */}
          <div>
            <label className="block text-mobile-sm font-medium text-gray-700 mb-2">
              圃場 <span className="text-gray-500">(任意)</span>
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 flex-shrink-0" />
              <select
                value={formData.fieldId}
                onChange={(e) => setFormData(prev => ({ ...prev, fieldId: e.target.value }))}
                className="mobile-input pl-12 pr-4"
                disabled={loading}
                aria-label="圃場を選択"
              >
                <option value="">圃場を選択...</option>
                {fields.map((field) => (
                  <option key={field.id} value={field.id}>
                    {field.name} {field.crop && `(${field.crop})`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Activity Type - Mobile optimized grid */}
          <div>
            <label className="block text-mobile-sm font-medium text-gray-700 mb-2">
              活動タイプ
            </label>
            <div className="mobile-grid-2 gap-2">
              {ACTIVITY_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    type: type.value,
                    unit: type.units.length > 0 ? type.units[0] : '',
                  }))}
                  className={`mobile-btn-secondary text-left mobile-tap ${
                    formData.type === type.value
                      ? 'bg-green-50 border-green-500 text-green-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  aria-pressed={formData.type === type.value}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{type.icon}</span>
                    <span className="text-mobile-sm font-medium">{type.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Quantity and Unit - Mobile responsive */}
          {selectedActivityType && selectedActivityType.units.length > 0 && (
            <div className="mobile-grid-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-mobile-sm font-medium text-gray-700 mb-2">
                  数量 <span className="text-gray-500">(任意)</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.quantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                  placeholder="例: 20"
                  className="mobile-input"
                  inputMode="decimal"
                />
              </div>
              <div>
                <label className="block text-mobile-sm font-medium text-gray-700 mb-2">
                  単位
                </label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                  className="mobile-input"
                >
                  {selectedActivityType.units.map((unit) => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Date and Time - Mobile optimized */}
          <div>
            <label className="block text-mobile-sm font-medium text-gray-700 mb-2">
              実施日時
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 flex-shrink-0" />
              <input
                type="datetime-local"
                value={formData.performedAt}
                onChange={(e) => setFormData(prev => ({ ...prev, performedAt: e.target.value }))}
                className="mobile-input pl-12 pr-4"
              />
            </div>
          </div>

          {/* Notes - Mobile optimized */}
          <div>
            <label className="block text-mobile-sm font-medium text-gray-700 mb-2">
              メモ <span className="text-gray-500">(任意)</span>
            </label>
            <textarea
              value={formData.note}
              onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
              placeholder="活動に関する詳細なメモ..."
              rows={3}
              className="mobile-input resize-none"
              autoCapitalize="sentences"
              autoCorrect="on"
            />
          </div>

          {/* Actions - Mobile optimized */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 mobile-btn-secondary"
              disabled={saving}
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 mobile-btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span className="text-mobile-sm">保存中...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span className="text-mobile-sm">保存</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
