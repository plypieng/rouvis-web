'use client';

import { useState } from 'react';

export function AnalyticsFilters() {
  const [timeRange, setTimeRange] = useState('1year');
  const [cropFilter, setCropFilter] = useState('all');
  const [compareWith, setCompareWith] = useState('previous');

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Time Range</label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="3months">Last 3 Months</option>
            <option value="6months">Last 6 Months</option>
            <option value="1year">Last 1 Year</option>
            <option value="3years">Last 3 Years</option>
            <option value="5years">Last 5 Years</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Crop Type</label>
          <select
            value={cropFilter}
            onChange={(e) => setCropFilter(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="all">All Crops</option>
            <option value="rice">Rice</option>
            <option value="vegetables">Vegetables</option>
            <option value="fruits">Fruits</option>
            <option value="soybeans">Soybeans</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Compare With</label>
          <select
            value={compareWith}
            onChange={(e) => setCompareWith(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="previous">Previous Period</option>
            <option value="average">Regional Average</option>
            <option value="target">Target Goals</option>
            <option value="none">No Comparison</option>
          </select>
        </div>
      </div>
      
      <div className="flex justify-end mt-4 space-x-2">
        <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
          Reset Filters
        </button>
        <button className="px-4 py-2 bg-primary-600 rounded-lg text-sm font-medium text-white hover:bg-primary-700">
          Apply Filters
        </button>
      </div>
    </div>
  );
}
