'use client';

import { useState, useEffect } from 'react';
import { X, Save, Calendar, Clock, MapPin, AlertTriangle } from 'lucide-react';
import { toastError, toastSuccess } from '@/lib/feedback';

interface Field {
  id: string;
  name: string;
  crop?: string;
  area?: number;
}

interface TaskSchedulerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: {
    title: string;
    dueAt: string;
    fieldId?: string;
    notes?: string;
  }) => Promise<void>;
  initialFieldId?: string;
}

const PRIORITY_LEVELS = [
  { value: 'low', label: '低', color: 'bg-green-100 text-green-800' },
  { value: 'medium', label: '中', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'high', label: '高', color: 'bg-red-100 text-red-800' },
] as const;

type Priority = (typeof PRIORITY_LEVELS)[number]['value'];

export function TaskSchedulerModal({
  isOpen,
  onClose,
  onSave,
  initialFieldId,
}: TaskSchedulerModalProps) {
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    dueAt: '',
    fieldId: initialFieldId || '',
    priority: 'medium' as Priority,
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      fetchFields();
      // Set default due date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setFormData(prev => ({
        ...prev,
        fieldId: initialFieldId || '',
        dueAt: tomorrow.toISOString().slice(0, 16), // YYYY-MM-DDTHH:MM format
      }));
      setErrorMessage(null);
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

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'タスク名は必須です';
    }

    if (!formData.dueAt) {
      newErrors.dueAt = '期限は必須です';
    } else {
      const dueDate = new Date(formData.dueAt);
      const now = new Date();
      if (dueDate <= now) {
        newErrors.dueAt = '期限は現在時刻より後に設定してください';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submitTask = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    try {
      await onSave({
        title: formData.title.trim(),
        dueAt: formData.dueAt,
        fieldId: formData.fieldId || undefined,
        notes: formData.notes.trim() || undefined,
      });

      // Reset form
      setFormData({
        title: '',
        dueAt: '',
        fieldId: '',
        priority: 'medium',
        notes: '',
      });
      setErrors({});

      onClose();
      toastSuccess('タスクを保存しました。');
    } catch (error) {
      console.error('Failed to save task:', error);
      const message = error instanceof Error ? error.message : 'タスクの保存に失敗しました';
      setErrorMessage(message);
      toastError(message, {
        label: '再試行',
        onClick: () => {
          void submitTask();
        },
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitTask();
  };

  const getSelectedPriority = () => {
    return PRIORITY_LEVELS.find(p => p.value === formData.priority);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 safe-top safe-bottom p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto mobile-scroll">
        {/* Header - Mobile optimized */}
        <div className="flex items-center justify-between mobile-spacing border-b">
          <h2 className="text-mobile-lg font-semibold text-gray-900">タスクを予定</h2>
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
                  onClick={() => {
                    void submitTask();
                  }}
                  className="rounded-md border border-current px-2 py-1 text-xs font-semibold hover:bg-white/40"
                  disabled={saving}
                >
                  再試行
                </button>
              </div>
            </div>
          )}

          {/* Task Title - Mobile optimized */}
          <div>
            <label className="block text-mobile-sm font-medium text-gray-700 mb-2">
              タスク名
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="例: コシヒカリの水やり"
              className={`mobile-input ${
                errors.title ? 'border-red-300' : ''
              }`}
              autoCapitalize="sentences"
              autoComplete="off"
            />
            {errors.title && (
              <p className="mt-1 text-mobile-sm text-red-600 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {errors.title}
              </p>
            )}
          </div>

          {/* Field Selection - Mobile optimized */}
          <div>
            <label className="block text-mobile-sm font-medium text-gray-700 mb-2">
              関連圃場 <span className="text-gray-500">(任意)</span>
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 flex-shrink-0" />
              <select
                value={formData.fieldId}
                onChange={(e) => setFormData(prev => ({ ...prev, fieldId: e.target.value }))}
                className="mobile-input pl-12 pr-4"
                disabled={loading}
                aria-label="関連圃場を選択"
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

          {/* Due Date - Mobile optimized */}
          <div>
            <label className="block text-mobile-sm font-medium text-gray-700 mb-2">
              期限
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 flex-shrink-0" />
              <input
                type="datetime-local"
                value={formData.dueAt}
                onChange={(e) => setFormData(prev => ({ ...prev, dueAt: e.target.value }))}
                className={`mobile-input pl-12 pr-4 ${
                  errors.dueAt ? 'border-red-300' : ''
                }`}
              />
            </div>
            {errors.dueAt && (
              <p className="mt-1 text-mobile-sm text-red-600 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {errors.dueAt}
              </p>
            )}
          </div>

          {/* Priority - Mobile optimized grid */}
          <div>
            <label className="block text-mobile-sm font-medium text-gray-700 mb-2">
              優先度
            </label>
            <div className="mobile-grid-2 gap-2">
              {PRIORITY_LEVELS.map((priority) => (
                <button
                  key={priority.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, priority: priority.value }))}
                  className={`mobile-btn-secondary text-left mobile-tap ${
                    formData.priority === priority.value
                      ? `${priority.color} border-current`
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  aria-pressed={formData.priority === priority.value}
                >
                  <span className="text-mobile-sm font-medium">{priority.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Notes - Mobile optimized */}
          <div>
            <label className="block text-mobile-sm font-medium text-gray-700 mb-2">
              詳細メモ <span className="text-gray-500">(任意)</span>
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="タスクの詳細な説明や注意事項..."
              rows={3}
              className="mobile-input resize-none"
              autoCapitalize="sentences"
              autoCorrect="on"
            />
          </div>

          {/* Preview - Mobile optimized */}
          <div className="bg-gray-50 rounded-lg mobile-spacing">
            <h4 className="text-mobile-sm font-medium text-gray-700 mb-2">プレビュー</h4>
            <div className="text-mobile-sm text-gray-600 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{formData.title || 'タスク名'}</span>
                {getSelectedPriority() && (
                  <span className={`text-mobile-sm px-2 py-0.5 rounded-full ${getSelectedPriority()?.color}`}>
                    {getSelectedPriority()?.label}
                  </span>
                )}
              </div>
              {formData.dueAt && (
                <div className="flex items-center gap-2 text-gray-500">
                  <Clock className="w-4 h-4 flex-shrink-0" />
                  <span>{new Date(formData.dueAt).toLocaleString('ja-JP')}</span>
                </div>
              )}
              {formData.fieldId && (
                <div className="flex items-center gap-2 text-gray-500">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span>{fields.find(f => f.id === formData.fieldId)?.name}</span>
                </div>
              )}
            </div>
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
                  <span className="text-mobile-sm">予定する</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
