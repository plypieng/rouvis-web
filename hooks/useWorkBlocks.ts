'use client';

import { useState, useEffect, useCallback } from 'react';

export interface WorkBlock {
  id: string;
  task_name: string;
  task_type: 'watering' | 'fertilizing' | 'pest_control' | 'harvesting' | 'other';
  time_of_day: 'morning' | 'afternoon' | 'all_day';
  date: string;
  field_id?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  status?: 'pending' | 'scheduled' | 'completed' | 'cancelled';
}

interface UseWorkBlocksOptions {
  fieldId?: string;
  startDate?: string;
  endDate?: string;
}

interface UseWorkBlocksReturn {
  workBlocks: WorkBlock[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  createWorkBlock: (workBlock: Omit<WorkBlock, 'id'>) => Promise<void>;
  updateWorkBlock: (id: string, updates: Partial<WorkBlock>) => Promise<void>;
  deleteWorkBlock: (id: string) => Promise<void>;
}

export function useWorkBlocks(options: UseWorkBlocksOptions = {}): UseWorkBlocksReturn {
  const { fieldId, startDate, endDate } = options;
  const [workBlocks, setWorkBlocks] = useState<WorkBlock[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkBlocks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (fieldId) params.append('field_id', fieldId);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      params.append('limit', '100');

      const response = await fetch(`/api/v1/tasks?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch work blocks');
      }

      const data = await response.json();

      // Transform tasks to work blocks
      const blocks: WorkBlock[] = (data.tasks || []).map((task: any) => ({
        id: task.id,
        task_name: task.title || task.task_name || '作業',
        task_type: task.task_type || task.type || 'other',
        time_of_day: task.time_of_day || 'all_day',
        date: task.due_at || task.date,
        field_id: task.field_id,
        description: task.description,
        priority: task.priority,
        status: task.status || 'pending',
      }));

      setWorkBlocks(blocks);
    } catch (err) {
      console.error('Failed to fetch work blocks:', err);
      setError('作業予定の読み込みに失敗しました');
      setWorkBlocks([]);
    } finally {
      setLoading(false);
    }
  }, [fieldId, startDate, endDate]);

  useEffect(() => {
    fetchWorkBlocks();
  }, [fetchWorkBlocks]);

  const createWorkBlock = useCallback(async (workBlock: Omit<WorkBlock, 'id'>) => {
    try {
      const response = await fetch('/api/v1/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': `work-block-${Date.now()}-${Math.random()}`,
        },
        body: JSON.stringify({
          title: workBlock.task_name,
          task_type: workBlock.task_type,
          time_of_day: workBlock.time_of_day,
          due_at: workBlock.date,
          field_id: workBlock.field_id,
          description: workBlock.description,
          priority: workBlock.priority,
          status: workBlock.status || 'pending',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create work block');
      }

      await fetchWorkBlocks();
    } catch (err) {
      console.error('Failed to create work block:', err);
      throw err;
    }
  }, [fetchWorkBlocks]);

  const updateWorkBlock = useCallback(async (id: string, updates: Partial<WorkBlock>) => {
    try {
      const response = await fetch(`/api/v1/tasks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': `work-block-update-${id}-${Date.now()}`,
        },
        body: JSON.stringify({
          title: updates.task_name,
          task_type: updates.task_type,
          time_of_day: updates.time_of_day,
          due_at: updates.date,
          field_id: updates.field_id,
          description: updates.description,
          priority: updates.priority,
          status: updates.status,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update work block');
      }

      await fetchWorkBlocks();
    } catch (err) {
      console.error('Failed to update work block:', err);
      throw err;
    }
  }, [fetchWorkBlocks]);

  const deleteWorkBlock = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/v1/tasks/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete work block');
      }

      await fetchWorkBlocks();
    } catch (err) {
      console.error('Failed to delete work block:', err);
      throw err;
    }
  }, [fetchWorkBlocks]);

  return {
    workBlocks,
    loading,
    error,
    refetch: fetchWorkBlocks,
    createWorkBlock,
    updateWorkBlock,
    deleteWorkBlock,
  };
}
