'use client';

import { useState, useEffect } from 'react';

export interface FieldMetadata {
  id: string;
  name: string;
  crop?: string;
  area_sqm?: number;
  variety?: string;
  seeding_date?: string;
  harvest_date?: string;
  growth_stage?: string;
  moisture_percent?: number;
  leaf_color?: string;
  notes?: string;
  metadata?: {
    variety?: string;
    seeding_date?: string;
    harvest_date?: string;
    growth_stage?: string;
    moisture_percent?: number;
    leaf_color?: string;
    [key: string]: any;
  };
}

interface UseFieldMetadataReturn {
  field: FieldMetadata | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useFieldMetadata(fieldId?: string): UseFieldMetadataReturn {
  const [field, setField] = useState<FieldMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchField = async () => {
    if (!fieldId) {
      setField(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/v1/fields/${fieldId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch field metadata');
      }

      const data = await response.json();

      // Normalize metadata from nested structure
      const normalizedField: FieldMetadata = {
        ...data,
        variety: data.metadata?.variety || data.variety,
        seeding_date: data.metadata?.seeding_date || data.seeding_date,
        harvest_date: data.metadata?.harvest_date || data.harvest_date,
        growth_stage: data.metadata?.growth_stage || data.growth_stage,
        moisture_percent: data.metadata?.moisture_percent || data.moisture_percent,
        leaf_color: data.metadata?.leaf_color || data.leaf_color,
        notes: data.metadata?.notes || data.notes,
      };

      setField(normalizedField);
    } catch (err) {
      console.error('Failed to fetch field:', err);
      setError('圃場情報の読み込みに失敗しました');
      setField(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchField();
  }, [fieldId]);

  return {
    field,
    loading,
    error,
    refetch: fetchField,
  };
}
