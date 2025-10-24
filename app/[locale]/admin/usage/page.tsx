'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, DollarSign, Zap, AlertCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface UsageData {
  userId: string;
  since: string;
  models: Record<string, { count: number; input: number; output: number; total: number }>;
  totalRequests: number;
}

export default function UsageDashboard() {
  const t = useTranslations('admin.usage');
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d'>('7d');

  useEffect(() => {
    fetchUsageData();
  }, [timeRange]);

  async function fetchUsageData() {
    setLoading(true);
    setError(null);

    try {
      const now = new Date();
      const since = new Date(now.getTime() - (timeRange === '7d' ? 7 : 30) * 24 * 3600 * 1000);

      const response = await fetch(
        `/api/admin/usage?since=${encodeURIComponent(since.toISOString())}`,
        { cache: 'no-store' }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }

      const json = await response.json();
      setData(json);
    } catch (err) {
      console.error('Failed to fetch usage:', err);
      setError(err instanceof Error ? err.message : 'Failed to load usage data');
    } finally {
      setLoading(false);
    }
  }

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

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <h2 className="text-lg font-semibold text-red-900">エラー</h2>
            </div>
            <p className="text-red-700">{error || 'データの読み込みに失敗しました'}</p>
            <button
              onClick={fetchUsageData}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              再試行
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Calculate metrics
  const totalTokens = Object.values(data.models).reduce((sum, m) => sum + m.total, 0);
  const totalInputTokens = Object.values(data.models).reduce((sum, m) => sum + m.input, 0);
  const totalOutputTokens = Object.values(data.models).reduce((sum, m) => sum + m.output, 0);

  // Rough cost estimates (GPT-4 pricing as baseline)
  // chatgpt-5-mini: ~$0.15/1M input, ~$0.60/1M output
  // chatgpt-5-pro: ~$3/1M input, ~$15/1M output
  const estimatedCost = (totalInputTokens * 0.15 / 1_000_000) + (totalOutputTokens * 0.60 / 1_000_000);
  const estimatedCostJPY = estimatedCost * 150; // Rough USD to JPY conversion

  // Prepare chart data
  const chartData = Object.entries(data.models).map(([model, stats]) => ({
    model: model.replace('chatgpt-', ''),
    リクエスト数: stats.count,
    入力トークン: stats.input,
    出力トークン: stats.output,
    合計トークン: stats.total,
  }));

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <Link
              href="/admin"
              className="text-sm text-gray-600 hover:text-gray-900 mb-2 inline-block"
            >
              ← 管理ダッシュボード
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              {t('title') || '使用状況'}
            </h1>
          </div>

          <div className="flex gap-2">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as '7d' | '30d')}
              className="border border-gray-300 rounded-lg px-4 py-2 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="7d">過去7日間</option>
              <option value="30d">過去30日間</option>
            </select>

            <button
              onClick={fetchUsageData}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              更新
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <Zap className="w-5 h-5 text-blue-500" />
              <span className="text-sm text-gray-600">総トークン数</span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-gray-900">
              {totalTokens.toLocaleString()}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              <span className="text-sm text-gray-600">推定コスト</span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-gray-900">
              ¥{estimatedCostJPY.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              ${estimatedCost.toFixed(4)} USD
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-purple-500" />
              <span className="text-sm text-gray-600">API呼び出し数</span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-gray-900">
              {data.totalRequests || Object.values(data.models).reduce((sum, m) => sum + m.count, 0)}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <Zap className="w-5 h-5 text-orange-500" />
              <span className="text-sm text-gray-600">平均トークン/リクエスト</span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-gray-900">
              {Math.round(totalTokens / (data.totalRequests || 1)).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Token Distribution Chart */}
        {chartData.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200 mb-8">
            <h2 className="text-lg font-semibold mb-4">モデル別トークン使用量</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="model" />
                  <YAxis />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Bar dataKey="入力トークン" fill="#3b82f6" />
                  <Bar dataKey="出力トークン" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Model Breakdown Table */}
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">モデル別使用状況</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">モデル</th>
                  <th className="text-right px-6 py-3 text-sm font-medium text-gray-600">リクエスト数</th>
                  <th className="text-right px-6 py-3 text-sm font-medium text-gray-600">入力トークン</th>
                  <th className="text-right px-6 py-3 text-sm font-medium text-gray-600">出力トークン</th>
                  <th className="text-right px-6 py-3 text-sm font-medium text-gray-600">合計</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data.models).map(([model, stats]) => (
                  <tr key={model} className="border-t hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium">{model}</td>
                    <td className="text-right px-6 py-4">{stats.count.toLocaleString()}</td>
                    <td className="text-right px-6 py-4">{stats.input.toLocaleString()}</td>
                    <td className="text-right px-6 py-4">{stats.output.toLocaleString()}</td>
                    <td className="text-right px-6 py-4 font-semibold">{stats.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 font-semibold">
                <tr className="border-t-2">
                  <td className="px-6 py-4">合計</td>
                  <td className="text-right px-6 py-4">
                    {Object.values(data.models).reduce((sum, m) => sum + m.count, 0).toLocaleString()}
                  </td>
                  <td className="text-right px-6 py-4">{totalInputTokens.toLocaleString()}</td>
                  <td className="text-right px-6 py-4">{totalOutputTokens.toLocaleString()}</td>
                  <td className="text-right px-6 py-4">{totalTokens.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Data Info */}
        <div className="mt-6 text-sm text-gray-500 text-center">
          データ期間: {new Date(data.since).toLocaleString('ja-JP')} - 現在
        </div>
      </div>
    </div>
  );
}
