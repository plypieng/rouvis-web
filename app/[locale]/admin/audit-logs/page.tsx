'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Search, Filter, Download, RefreshCw, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';

interface AuditLog {
  id: string;
  user_id?: string | null;
  tenant_id?: string | null;
  action: string;
  resource: string;
  details?: any;
  created_at: string;
}

export default function AuditLogsPage() {
  const t = useTranslations('admin.audit_logs');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [limit, setLimit] = useState(50);

  useEffect(() => {
    fetchLogs();
  }, [limit]);

  async function fetchLogs() {
    setLoading(true);
    setError(null);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
      const response = await fetch(`${apiBase}/api/v1/audit-logs?limit=${limit}`, {
        headers: {
          'x-api-key': process.env.NEXT_PUBLIC_INTERNAL_API_KEY || '',
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }

      const json = await response.json();
      setLogs(json.logs || []);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
      setError(err instanceof Error ? err.message : 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }

  const toggleRowExpand = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const filteredLogs = logs.filter((log) => {
    if (actionFilter !== 'all' && log.action !== actionFilter) return false;
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        log.action.toLowerCase().includes(searchLower) ||
        log.resource.toLowerCase().includes(searchLower) ||
        (log.user_id && log.user_id.toLowerCase().includes(searchLower))
      );
    }
    return true;
  });

  // Get unique actions for filter dropdown
  const uniqueActions = Array.from(new Set(logs.map((log) => log.action))).sort();

  const exportToCSV = () => {
    const headers = ['Time', 'User', 'Action', 'Resource', 'Details'];
    const rows = filteredLogs.map((log) => [
      new Date(log.created_at).toISOString(),
      log.user_id || '-',
      log.action,
      log.resource,
      JSON.stringify(log.details || {}),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `audit-logs-${new Date().toISOString()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
            <div className="text-gray-600">読み込み中...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <h2 className="text-lg font-semibold text-red-900">エラー</h2>
            </div>
            <p className="text-red-700">{error}</p>
            <button
              onClick={fetchLogs}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              再試行
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin"
            className="text-sm text-gray-600 hover:text-gray-900 mb-2 inline-block"
          >
            ← 管理ダッシュボード
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            {t('title') || '監査ログ'}
          </h1>
          <p className="text-gray-600">
            全{logs.length}件のログ ({filteredLogs.length}件表示中)
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6 border border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('search_placeholder') || '検索...'}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">{t('all_actions') || 'すべてのアクション'}</option>
                {uniqueActions.map((action) => (
                  <option key={action} value={action}>
                    {action}
                  </option>
                ))}
              </select>

              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={50}>50件</option>
                <option value={100}>100件</option>
                <option value={200}>200件</option>
                <option value={500}>500件</option>
              </select>

              <button
                onClick={exportToCSV}
                className="px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 flex items-center gap-2"
                title="CSV出力"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">CSV</span>
              </button>

              <button
                onClick={fetchLogs}
                className="px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 flex items-center gap-2"
                title="更新"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">更新</span>
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 sm:px-6 py-3 text-sm font-medium text-gray-600">
                    時刻
                  </th>
                  <th className="text-left px-4 sm:px-6 py-3 text-sm font-medium text-gray-600">
                    ユーザー
                  </th>
                  <th className="text-left px-4 sm:px-6 py-3 text-sm font-medium text-gray-600">
                    アクション
                  </th>
                  <th className="text-left px-4 sm:px-6 py-3 text-sm font-medium text-gray-600">
                    リソース
                  </th>
                  <th className="text-left px-4 sm:px-6 py-3 text-sm font-medium text-gray-600">
                    詳細
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => {
                  const isExpanded = expandedRows.has(log.id);
                  return (
                    <tr key={log.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 sm:px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('ja-JP', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm">
                        <span className="font-mono text-xs">
                          {log.user_id ? log.user_id.substring(0, 8) + '...' : '-'}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-gray-600">
                        {log.resource}
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        {log.details && Object.keys(log.details).length > 0 ? (
                          <button
                            onClick={() => toggleRowExpand(log.id)}
                            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="w-4 h-4" />
                                <span>閉じる</span>
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-4 h-4" />
                                <span>表示</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                        {isExpanded && log.details && (
                          <div className="mt-2 p-3 bg-gray-50 rounded border border-gray-200 max-w-2xl">
                            <pre className="text-xs text-gray-700 whitespace-pre-wrap break-words overflow-x-auto">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredLogs.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                {search || actionFilter !== 'all'
                  ? 'フィルター条件に一致するログが見つかりません'
                  : 'ログが見つかりません'}
              </div>
            )}
          </div>
        </div>

        {/* Info Footer */}
        <div className="mt-6 text-sm text-gray-500 text-center">
          最新の{limit}件を表示しています
        </div>
      </div>
    </div>
  );
}
