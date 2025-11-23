'use client';

import { useState } from 'react';

type Crop = {
  id: string;
  name: string;
  icon: string;
  category: string;
  preferredSoil: string;
  growingPeriod: string;
  waterNeeds: 'low' | 'medium' | 'high';
};

export function CropSelectionPanel() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Mock data for demonstration
  const crops: Crop[] = [
    {
      id: '1',
      name: 'Koshihikari Rice',
      icon: '🌾',
      category: 'Grains',
      preferredSoil: 'Clay loam',
      growingPeriod: '120-140 days',
      waterNeeds: 'high',
    },
    {
      id: '2',
      name: 'Tomatoes',
      icon: '🍅',
      category: 'Vegetables',
      preferredSoil: 'Well-draining loam',
      growingPeriod: '70-85 days',
      waterNeeds: 'medium',
    },
    {
      id: '3',
      name: 'Edamame',
      icon: '🫛',
      category: 'Legumes',
      preferredSoil: 'Loamy soil',
      growingPeriod: '80-100 days',
      waterNeeds: 'medium',
    },
    {
      id: '4',
      name: 'Sweet Potatoes',
      icon: '🍠',
      category: 'Root Vegetables',
      preferredSoil: 'Sandy loam',
      growingPeriod: '100-150 days',
      waterNeeds: 'low',
    },
    {
      id: '5',
      name: 'Cucumbers',
      icon: '🥒',
      category: 'Vegetables',
      preferredSoil: 'Rich, loamy soil',
      growingPeriod: '50-70 days',
      waterNeeds: 'high',
    },
    {
      id: '6',
      name: 'Strawberries',
      icon: '🍓',
      category: 'Fruits',
      preferredSoil: 'Sandy loam',
      growingPeriod: 'Perennial',
      waterNeeds: 'medium',
    },
  ];

  const categories = [...new Set(crops.map(crop => crop.category))];
  
  const filteredCrops = crops.filter(crop => {
    const matchesSearch = searchQuery === '' || 
      crop.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === null || crop.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <h2 className="text-lg font-semibold mb-3">Crop Selection</h2>
      
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search crops..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-lg text-sm"
        />
      </div>
      
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-2 py-1 text-xs rounded-full ${
            selectedCategory === null
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          All
        </button>
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-2 py-1 text-xs rounded-full ${
              selectedCategory === category
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {category}
          </button>
        ))}
      </div>
      
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {filteredCrops.map((crop) => (
          <div
            key={crop.id}
            className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('cropId', crop.id);
            }}
          >
            <div className="flex items-center">
              <span className="text-xl mr-2">{crop.icon}</span>
              <span className="font-medium">{crop.name}</span>
            </div>
            <div className="mt-2 text-xs text-gray-500 grid grid-cols-2 gap-1">
              <div>Soil: {crop.preferredSoil}</div>
              <div>Period: {crop.growingPeriod}</div>
              <div className="col-span-2">
                Water Needs: 
                <span className={`ml-1 ${
                  crop.waterNeeds === 'high' 
                    ? 'text-blue-600' 
                    : crop.waterNeeds === 'medium' 
                      ? 'text-green-600'
                      : 'text-yellow-600'
                }`}>
                  {crop.waterNeeds}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 text-center text-xs text-gray-500">
        Drag crops onto the map to assign them to plots
      </div>
    </div>
  );
}
