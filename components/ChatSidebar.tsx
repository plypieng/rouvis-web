'use client';

import { useState } from 'react';

type SuggestedPrompt = {
  id: string;
  text: string;
  category: string;
};

export function ChatSidebar() {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Mock data for demonstration
  // 提案プロンプト（デモ用）
  const suggestedPrompts: SuggestedPrompt[] = [
    {
      id: '1',
      text: "今シーズン新潟の気候に最適な作物は何ですか？",
      category: 'planning',
    },
    {
      id: '2',
      text: "水田の3年間の輪作計画を立てるのを手伝ってください。",
      category: 'planning',
    },
    {
      id: '3',
      text: "潅漑システムを水資源節約のために最適化する方法は？",
      category: 'resources',
    },
    {
      id: '4',
      text: "2ヘクタールを有機栽培に切り替えた場合の収益分析を作成してください。",
      category: 'business',
    },
    {
      id: '5',
      text: "今シーズン、いもち病予防のために取るべき対策は？",
      category: 'problems',
    },
    {
      id: '6',
      text: "土壌分析レポートの読み取りと改良材の推奨をお願いします。",
      category: 'analysis',
    },
    {
      id: '7',
      text: "作物計画に最適化された施肥スケジュールを作成してください。",
      category: 'planning',
    },
    {
      id: '8',
      text: "機器倉庫に太陽光パネルを設置した場合のROIは？",
      category: 'business',
    },
  ];

  // カテゴリ（日本語）
  const categories = [
    { id: 'all', label: 'すべての提案' },
    { id: 'planning', label: '農場計画' },
    { id: 'business', label: 'ビジネス・財務' },
    { id: 'problems', label: '問題解決' },
    { id: 'resources', label: '資源管理' },
    { id: 'analysis', label: 'データ分析' },
  ];

  const filteredPrompts = activeCategory === 'all' 
    ? suggestedPrompts 
    : suggestedPrompts.filter(prompt => prompt.category === activeCategory);

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <h2 className="text-lg font-semibold mb-3">会話履歴</h2>
        <div className="space-y-2">
          <div className="p-2 rounded-lg bg-primary-50 text-primary-700 text-sm border border-primary-100">
            <div className="font-medium">現在の会話</div>
            <div className="text-xs text-gray-500 mt-1">開始日: 2025年5月18日</div>
          </div>
          
          <div className="p-2 rounded-lg hover:bg-gray-50 text-sm border border-gray-100">
            <div className="font-medium">輪作計画</div>
            <div className="text-xs text-gray-500 mt-1">May 15, 2025</div>
          </div>
          
          <div className="p-2 rounded-lg hover:bg-gray-50 text-sm border border-gray-100">
            <div className="font-medium">水管理戦略</div>
            <div className="text-xs text-gray-500 mt-1">May 10, 2025</div>
          </div>
          
          <div className="p-2 rounded-lg hover:bg-gray-50 text-sm border border-gray-100">
            <div className="font-medium">市場分析</div>
            <div className="text-xs text-gray-500 mt-1">May 5, 2025</div>
          </div>
        </div>
        
        <button className="w-full mt-3 text-sm text-primary-600 hover:underline">
          すべての会話を見る
        </button>
      </div>
      
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <h2 className="text-lg font-semibold mb-3">提案された質問</h2>
        
        <div className="flex flex-wrap gap-2 mb-3">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`px-2 py-1 text-xs rounded-lg ${
                activeCategory === category.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>
        
        <div className="space-y-2">
          {filteredPrompts.map((prompt) => (
            <div 
              key={prompt.id}
              className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm cursor-pointer"
            >
              {prompt.text}
            </div>
          ))}
        </div>
      </div>
      
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <h2 className="text-lg font-semibold mb-3">アシスタントの機能</h2>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start">
            <span className="text-green-500 mr-2">✓</span>
            <span>戦略的な作物計画と輪作の最適化</span>
          </li>
          <li className="flex items-start">
            <span className="text-green-500 mr-2">✓</span>
            <span>土壌分析レポートの詳細解析と推奨</span>
          </li>
          <li className="flex items-start">
            <span className="text-green-500 mr-2">✓</span>
            <span>新潟の気候に適応した農業戦略</span>
          </li>
          <li className="flex items-start">
            <span className="text-green-500 mr-2">✓</span>
            <span>財務予測とビジネス計画</span>
          </li>
          <li className="flex items-start">
            <span className="text-green-500 mr-2">✓</span>
            <span>資源の最適化（水、労力、投入資材）</span>
          </li>
          <li className="flex items-start">
            <span className="text-green-500 mr-2">✓</span>
            <span>害虫・病害管理のガイダンス</span>
          </li>
        </ul>
        
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            This assistant is trained on agricultural data specific to Niigata Prefecture and is updated with information as of May 2025.
          </div>
        </div>
      </div>
    </div>
  );
}
