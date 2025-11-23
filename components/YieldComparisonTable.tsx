'use client';

import { useState } from 'react';

type CropYieldData = {
  id: string;
  crop: string;
  variety: string;
  currentYield: number;
  previousYield: number;
  regionalAverage: number;
  growingArea: number;
  yieldUnit: string;
};

export function YieldComparisonTable() {
  const [sortField, setSortField] = useState<string>('crop');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Mock data for demonstration
  const cropYieldData: CropYieldData[] = [
    {
      id: '1',
      crop: 'Rice',
      variety: 'Koshihikari',
      currentYield: 5.8,
      previousYield: 5.2,
      regionalAverage: 5.4,
      growingArea: 2.5,
      yieldUnit: 'tons/ha',
    },
    {
      id: '2',
      crop: 'Rice',
      variety: 'Hitomebore',
      currentYield: 5.5,
      previousYield: 5.3,
      regionalAverage: 5.2,
      growingArea: 1.2,
      yieldUnit: 'tons/ha',
    },
    {
      id: '3',
      crop: 'Tomatoes',
      variety: 'Momotaro',
      currentYield: 75.3,
      previousYield: 68.7,
      regionalAverage: 72.1,
      growingArea: 0.3,
      yieldUnit: 'tons/ha',
    },
    {
      id: '4',
      crop: 'Cucumbers',
      variety: 'Natsu Suzumi',
      currentYield: 65.8,
      previousYield: 62.1,
      regionalAverage: 60.5,
      growingArea: 0.2,
      yieldUnit: 'tons/ha',
    },
    {
      id: '5',
      crop: 'Edamame',
      variety: 'Sayamusume',
      currentYield: 10.2,
      previousYield: 9.3,
      regionalAverage: 9.8,
      growingArea: 0.4,
      yieldUnit: 'tons/ha',
    },
    {
      id: '6',
      crop: 'Sweet Potatoes',
      variety: 'Beniharuka',
      currentYield: 32.7,
      previousYield: 28.9,
      regionalAverage: 30.2,
      growingArea: 0.5,
      yieldUnit: 'tons/ha',
    },
  ];

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedData = [...cropYieldData].sort((a, b) => {
    const aValue = a[sortField as keyof CropYieldData];
    const bValue = b[sortField as keyof CropYieldData];

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    } else if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }
    return 0;
  });

  const getChangePercentage = (current: number, previous: number) => {
    const change = ((current - previous) / previous) * 100;
    return change.toFixed(1);
  };

  const getComparisonStyle = (current: number, comparison: number) => {
    if (current > comparison) {
      return 'text-green-600';
    } else if (current < comparison) {
      return 'text-red-600';
    } else {
      return 'text-gray-600';
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b">
            <th
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
              onClick={() => handleSort('crop')}
            >
              Crop Type
              {sortField === 'crop' && (
                <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
              )}
            </th>
            <th
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
              onClick={() => handleSort('variety')}
            >
              Variety
              {sortField === 'variety' && (
                <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
              )}
            </th>
            <th
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
              onClick={() => handleSort('currentYield')}
            >
              Current Yield
              {sortField === 'currentYield' && (
                <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
              )}
            </th>
            <th
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
              onClick={() => handleSort('previousYield')}
            >
              Previous Yield
              {sortField === 'previousYield' && (
                <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
              )}
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Change
            </th>
            <th
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
              onClick={() => handleSort('regionalAverage')}
            >
              Regional Avg.
              {sortField === 'regionalAverage' && (
                <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
              )}
            </th>
            <th
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
              onClick={() => handleSort('growingArea')}
            >
              Area
              {sortField === 'growingArea' && (
                <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
              )}
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedData.map((crop) => (
            <tr key={crop.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                {crop.crop}
              </td>
              <td className="px-4 py-3 text-sm text-gray-500">{crop.variety}</td>
              <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                {crop.currentYield} {crop.yieldUnit}
              </td>
              <td className="px-4 py-3 text-sm text-gray-500">
                {crop.previousYield} {crop.yieldUnit}
              </td>
              <td
                className={`px-4 py-3 text-sm font-medium ${
                  Number(getChangePercentage(crop.currentYield, crop.previousYield)) > 0
                    ? 'text-green-600'
                    : Number(getChangePercentage(crop.currentYield, crop.previousYield)) < 0
                    ? 'text-red-600'
                    : 'text-gray-600'
                }`}
              >
                {Number(getChangePercentage(crop.currentYield, crop.previousYield)) > 0 ? '+' : ''}
                {getChangePercentage(crop.currentYield, crop.previousYield)}%
              </td>
              <td
                className={`px-4 py-3 text-sm ${getComparisonStyle(
                  crop.currentYield,
                  crop.regionalAverage
                )}`}
              >
                {crop.regionalAverage} {crop.yieldUnit}
              </td>
              <td className="px-4 py-3 text-sm text-gray-500">
                {crop.growingArea} ha
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      <div className="mt-4 bg-yellow-50 p-3 rounded-lg border border-yellow-100">
        <p className="text-sm text-yellow-800">
          <span className="font-medium">Note:</span> The current yield data reflects the 2025 growing season. Regional 
          averages are sourced from the Niigata Agricultural Association's annual report.
        </p>
      </div>
    </div>
  );
}
