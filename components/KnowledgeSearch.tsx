'use client';

import { useState } from 'react';

export function KnowledgeSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'articles', label: 'Articles' },
    { id: 'guides', label: 'Guides' },
    { id: 'videos', label: 'Videos' },
    { id: 'discussions', label: 'Discussions' },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real application, this would trigger a search API call
    console.log('Searching for:', searchQuery);
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <form onSubmit={handleSearch} className="flex">
        <input
          type="text"
          placeholder="Search knowledge base..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-primary-600 text-white rounded-r-lg hover:bg-primary-700"
        >
          Search
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-2 mt-3">
        <span className="text-sm text-gray-500">Filters:</span>
        {filters.map((filter) => (
          <button
            key={filter.id}
            onClick={() => setActiveFilter(filter.id === activeFilter ? null : filter.id)}
            className={`px-3 py-1 text-xs rounded-full ${
              filter.id === activeFilter
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-3">
        <span className="text-sm text-gray-500">Popular:</span>
        <button className="px-3 py-1 text-xs rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200">
          Rice diseases
        </button>
        <button className="px-3 py-1 text-xs rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200">
          Organic fertilizers
        </button>
        <button className="px-3 py-1 text-xs rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200">
          Water management
        </button>
        <button className="px-3 py-1 text-xs rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200">
          Crop rotation
        </button>
      </div>
    </div>
  );
}
