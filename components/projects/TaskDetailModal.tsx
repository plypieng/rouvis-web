'use client';

// import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
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
    // const t = useTranslations('projects.calendar');

    return (
        <AnimatePresence>
            {isOpen && task && (
                <div className="fixed inset-0 flex items-center justify-center z-50">
                    {/* Backdrop */}
                    <motion.div
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={onClose}
                    />

                    {/* Modal Content */}
                    <motion.div
                        className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl relative z-10 m-4 overflow-hidden"
                        initial={{ scale: 0.95, opacity: 0, y: 10 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 10 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex justify-between items-start mb-4">
                            <h2 className="text-xl font-bold text-gray-900 pr-8 leading-snug">
                                {task.title}
                            </h2>
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* Meta Info */}
                        <div className="flex flex-wrap gap-3 mb-6">
                            <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                <span className="material-symbols-outlined text-lg">calendar_today</span>
                                <span>{format(new Date(task.dueDate), 'yyyy年M月d日 (EEE)', { locale: ja })}</span>
                            </div>
                            {task.priority && (
                                <span className={`text-xs px-2 py-0.5 rounded-full border flex items-center ${task.priority === 'high' ? 'bg-red-50 text-red-700 border-red-200' :
                                    task.priority === 'low' ? 'bg-gray-50 text-gray-700 border-gray-200' :
                                        'bg-blue-50 text-blue-700 border-blue-200'
                                    }`}>
                                    {task.priority}
                                </span>
                            )}
                            <span className={`text-xs px-2 py-0.5 rounded-full border flex items-center ${task.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                }`}>
                                {task.status === 'completed' ? '完了' : '未完了'}
                            </span>
                        </div>

                        {/* Description */}
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 min-h-[120px]">
                            <h3 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">詳細・解説</h3>
                            {task.description ? (
                                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                                    {task.description}
                                </p>
                            ) : (
                                <p className="text-sm text-gray-400 italic">
                                    詳しい説明はありません。
                                </p>
                            )}
                        </div>

                        {/* Footer Action */}
                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
                            >
                                閉じる
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
