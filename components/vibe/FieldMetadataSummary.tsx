'use client';

import { useTranslations } from 'next-intl';
import { FieldMetadata } from '@/hooks/useFieldMetadata';

interface FieldMetadataSummaryProps {
  field: FieldMetadata;
}

export function FieldMetadataSummary({ field }: FieldMetadataSummaryProps) {
  const t = useTranslations('vibe');

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return dateString;
    }
  };

  const metadata = [
    { label: t('variety'), value: field.variety || '—' },
    { label: t('seeding_date'), value: formatDate(field.seeding_date) },
    { label: t('harvest_date'), value: formatDate(field.harvest_date) },
    { label: t('growth_stage'), value: field.growth_stage || '—' },
    {
      label: t('moisture'),
      value: field.moisture_percent !== undefined ? `${field.moisture_percent}%` : '—'
    },
    { label: t('leaf_color'), value: field.leaf_color || '—' },
  ];

  return (
    <div className="rounded-lg border border-secondary-200 bg-secondary-50 dark:bg-background/30 dark:border-secondary-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-crop-900 dark:text-white">
          {t('field_metadata')}
        </h4>
        {field.notes && (
          <a
            href="#"
            className="text-xs text-crop-600 hover:text-crop-700 dark:text-crop-400 hover:underline flex items-center gap-1"
          >
            <span className="material-symbols-outlined !text-sm">description</span>
            {t('view_notes')}
          </a>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {metadata.map((item, idx) => (
          <div key={idx} className="min-w-0">
            <dt className="text-xs text-secondary-600 dark:text-secondary-400 mb-0.5">
              {item.label}
            </dt>
            <dd className="text-sm font-medium text-crop-900 dark:text-white truncate">
              {item.value}
            </dd>
          </div>
        ))}
      </div>
    </div>
  );
}
