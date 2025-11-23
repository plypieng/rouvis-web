'use client';

import { useState, useEffect, useCallback } from 'react';

export interface Task {
  id: string;
  title: string;
  field?: string;
  estimatedTime?: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  weatherDependent?: boolean;
  dueDate?: string;
  description?: string;
}

interface UseTodayTasksOptions {
  selectedFieldId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseTodayTasksReturn {
  tasks: Task[];
  loading: boolean;
  error: Error | null;
  refreshTasks: () => Promise<void>;
  completeTask: (taskId: string) => Promise<void>;
  uncompleteTask: (taskId: string) => Promise<void>;
  toggleTask: (taskId: string) => Promise<void>;
  completedCount: number;
  totalCount: number;
  progressPercentage: number;
}

/**
 * Custom hook for fetching and managing today's tasks
 *
 * Usage:
 * - Fetches tasks from /api/v1/tasks?date=today
 * - Filters by selectedFieldId if provided
 * - Supports task completion with optimistic updates
 * - Includes undo support (uncompleteTask)
 */
export function useTodayTasks(options: UseTodayTasksOptions = {}): UseTodayTasksReturn {
  const { selectedFieldId, autoRefresh = false, refreshInterval = 60000 } = options;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch tasks from API
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query params
      const params = new URLSearchParams({
        date: 'today',
      });

      if (selectedFieldId) {
        params.append('fieldId', selectedFieldId);
      }

      const response = await fetch(`/api/v1/tasks?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch tasks: ${response.statusText}`);
      }

      const data = await response.json();

      // Transform API response to Task format
      const transformedTasks: Task[] = (data.tasks || []).map((task: any) => ({
        id: task.id,
        title: task.title || task.name,
        field: task.field?.name || task.fieldName,
        estimatedTime: task.estimatedTime || task.eta,
        priority: task.priority || 'medium',
        completed: task.completed || task.status === 'completed',
        weatherDependent: task.weatherDependent || false,
        dueDate: task.dueDate,
        description: task.description,
      }));

      setTasks(transformedTasks);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch tasks'));

      // Fallback to mock data for development
      if (process.env.NODE_ENV === 'development') {
        setTasks([
          {
            id: '1',
            title: 'A圃場に水やり',
            field: 'A圃場',
            estimatedTime: '30分',
            priority: 'high',
            completed: false,
            weatherDependent: true,
          },
          {
            id: '2',
            title: 'B圃場の生育確認',
            field: 'B圃場',
            estimatedTime: '15分',
            priority: 'medium',
            completed: false,
          },
          {
            id: '3',
            title: '作業記録の整理',
            estimatedTime: '10分',
            priority: 'low',
            completed: false,
          },
        ]);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedFieldId]);

  // Refresh tasks
  const refreshTasks = useCallback(async () => {
    await fetchTasks();
  }, [fetchTasks]);

  // Complete a task
  const completeTask = useCallback(async (taskId: string) => {
    // Optimistic update
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, completed: true } : task
      )
    );

    try {
      const response = await fetch(`/api/v1/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ completed: true, status: 'completed' }),
      });

      if (!response.ok) {
        throw new Error('Failed to complete task');
      }
    } catch (err) {
      console.error('Error completing task:', err);
      // Revert optimistic update
      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId ? { ...task, completed: false } : task
        )
      );
      setError(err instanceof Error ? err : new Error('Failed to complete task'));
    }
  }, []);

  // Uncomplete a task (undo)
  const uncompleteTask = useCallback(async (taskId: string) => {
    // Optimistic update
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, completed: false } : task
      )
    );

    try {
      const response = await fetch(`/api/v1/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ completed: false, status: 'pending' }),
      });

      if (!response.ok) {
        throw new Error('Failed to uncomplete task');
      }
    } catch (err) {
      console.error('Error uncompleting task:', err);
      // Revert optimistic update
      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId ? { ...task, completed: true } : task
        )
      );
      setError(err instanceof Error ? err : new Error('Failed to uncomplete task'));
    }
  }, []);

  // Toggle task completion
  const toggleTask = useCallback(async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    if (task.completed) {
      await uncompleteTask(taskId);
    } else {
      await completeTask(taskId);
    }
  }, [tasks, completeTask, uncompleteTask]);

  // Calculate progress metrics
  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;
  const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Initial fetch
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchTasks();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchTasks]);

  return {
    tasks,
    loading,
    error,
    refreshTasks,
    completeTask,
    uncompleteTask,
    toggleTask,
    completedCount,
    totalCount,
    progressPercentage,
  };
}
