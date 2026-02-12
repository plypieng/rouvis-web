'use client';

import { useLocale, useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';

interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  status: string;
  priority?: string;
}

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task?: Task;
}

export default function TaskDetailModal({ isOpen, onClose, task }: TaskDetailModalProps) {
  const locale = useLocale();
  const t = useTranslations('projects.calendar');
  const tPriority = useTranslations('priorities');

  const priorityKey = task?.priority === 'high' || task?.priority === 'medium' || task?.priority === 'low'
    ? task.priority
    : null;

  const dueDateLabel = task
    ? new Intl.DateTimeFormat(locale === 'ja' ? 'ja-JP' : locale, {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      weekday: 'short',
    }).format(new Date(task.dueDate))
    : '';

  return (
    <AnimatePresence>
      {isOpen && task ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            className="fixed inset-0 bg-black/45 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          <motion.div
            className="surface-overlay relative z-10 w-full max-w-md p-5"
            initial={{ scale: 0.96, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 className="pr-8 text-lg font-semibold text-foreground">{task.title}</h2>
              <button
                type="button"
                onClick={onClose}
                className="touch-target absolute right-3 top-3 rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label={t('task_detail_close')}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2 py-1 text-secondary-foreground">
                <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                {dueDateLabel}
              </span>
              <span className={`rounded-full px-2 py-1 font-semibold ${task.status === 'completed' ? 'status-safe' : 'status-watch'}`}>
                {task.status === 'completed' ? t('task_completed') : t('task_pending')}
              </span>
              {priorityKey ? (
                <span className={`rounded-full px-2 py-1 font-semibold ${
                  priorityKey === 'high' ? 'status-critical' : priorityKey === 'low' ? 'status-safe' : 'status-watch'
                }`}>
                  {tPriority(priorityKey)}
                </span>
              ) : null}
            </div>

            <div className="control-inset min-h-[120px] p-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {t('task_detail_heading')}
              </p>
              {task.description ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{task.description}</p>
              ) : (
                <p className="text-sm text-muted-foreground">{t('task_detail_empty')}</p>
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="touch-target rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground hover:bg-secondary/75"
              >
                {t('task_detail_close')}
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
