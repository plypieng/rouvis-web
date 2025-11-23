'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

interface Field {
  id: string;
  name: string;
  crop?: string;
  area_sqm?: number;
}

interface FieldSelectorCompactProps {
  value?: string;
  onChange: (fieldId: string) => void;
}

export function FieldSelectorCompact({ value, onChange }: FieldSelectorCompactProps) {
  const t = useTranslations('vibe');
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
        console.error('Failed to fetch fields:', err);
        setError('圃場の読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchFields();
  }, []);

  const selectedField = fields.find((f) => f.id === value);

  const formatArea = (area?: number) => {
    if (!area) return '';
    return `${area.toLocaleString()}㎡`;
  };

  return (
    <div className="relative">
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading || error !== null}
        className="w-full appearance-none rounded-lg border border-secondary-300 bg-white dark:bg-background/70 py-2.5 pl-4 pr-10 text-sm font-medium text-crop-900 dark:text-white focus:border-crop-500 focus:ring-1 focus:ring-crop-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading && <option value="">{t('field_selector')}...</option>}
        {error && <option value="">エラー</option>}
        {!loading && !error && fields.length === 0 && (
          <option value="">圃場がありません</option>
        )}
        {!loading && !error && fields.length > 0 && (
          <>
            {!value && <option value="">{t('field_selector')}</option>}
            {fields.map((field) => (
              <option key={field.id} value={field.id}>
                {field.name}
                {field.crop && ` (${field.crop}`}
                {field.area_sqm && `, ${formatArea(field.area_sqm)}`}
                {field.crop && ')'}
              </option>
            ))}
          </>
        )}
      </select>
      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-secondary-600 pointer-events-none !text-xl">
        expand_more
      </span>
    </div>
  );
}
