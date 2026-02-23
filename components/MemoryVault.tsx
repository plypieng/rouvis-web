'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';

type UserMemory = {
    id: string;
    fact: string;
    category: string;
    createdAt: string;
};

export default function MemoryVault() {
    const t = useTranslations('pages.settings');
    const [memories, setMemories] = useState<UserMemory[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchMemories = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/v1/memories', { cache: 'no-store' });
            if (!res.ok) {
                throw new Error('Failed to fetch memories');
            }
            const data = await res.json();
            setMemories(data.memories || []);
        } catch (err) {
            console.error(err);
            setError(t?.('memory_load_error') || 'Failed to load Farmer DNA memories.');
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        void fetchMemories();
    }, [fetchMemories]);

    const handleDelete = async (id: string) => {
        try {
            const res = await fetch(`/api/v1/memories/${id}`, { method: 'DELETE' });
            if (!res.ok) {
                throw new Error('Failed to delete memory');
            }
            setMemories((prev) => prev.filter((m) => m.id !== id));
        } catch (err) {
            console.error(err);
            alert(t?.('memory_delete_error') || 'Failed to delete memory.');
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined">psychology</span>
                {t?.('memory_vault_section') || 'Farmer DNA Vault'}
            </h2>
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                {t?.('memory_vault_desc') || "This is what Rouvis has learned and permanently remembered about your farm. Remove any inaccuracies."}
            </p>

            {loading ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading memories...</p>
            ) : error ? (
                <div className="flex flex-col gap-2">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    <button onClick={fetchMemories} className="text-sm text-emerald-600 dark:text-emerald-400 underline self-start">
                        Retry
                    </button>
                </div>
            ) : memories.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">No facts remembered yet.</p>
            ) : (
                <ul className="space-y-3">
                    {memories.map((m) => (
                        <li key={m.id} className="flex items-start justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800/50">
                            <div className="flex flex-col gap-1 pr-4">
                                <span className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                                    {m.category}
                                </span>
                                <span className="text-sm text-gray-800 dark:text-gray-200 leading-snug">
                                    {m.fact}
                                </span>
                            </div>
                            <button
                                onClick={() => handleDelete(m.id)}
                                className="text-gray-400 hover:text-red-500 transition-colors shrink-0"
                                title="Delete this memory"
                            >
                                <span className="material-symbols-outlined text-[20px]">delete</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
