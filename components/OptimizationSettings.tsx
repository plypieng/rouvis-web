'use client';

import { useState } from 'react';

type OptimizationGoal = 'yield' | 'profit' | 'sustainability' | 'water';

export function OptimizationSettings() {
  const [primaryGoal, setPrimaryGoal] = useState<OptimizationGoal>('yield');
  const [sliders, setSliders] = useState({
    yieldWeight: 70,
    profitWeight: 60,
    sustainabilityWeight: 50,
    waterConservationWeight: 40
  });

  const handleSliderChange = (name: string, value: number) => {
    setSliders(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <h2 className="text-lg font-semibold mb-3">Optimization Settings</h2>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Primary Optimization Goal</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setPrimaryGoal('yield')}
            className={`p-2 text-xs rounded-lg ${
              primaryGoal === 'yield'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            Maximum Yield
          </button>
          <button
            onClick={() => setPrimaryGoal('profit')}
            className={`p-2 text-xs rounded-lg ${
              primaryGoal === 'profit'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            Maximum Profit
          </button>
          <button
            onClick={() => setPrimaryGoal('sustainability')}
            className={`p-2 text-xs rounded-lg ${
              primaryGoal === 'sustainability'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            Sustainability
          </button>
          <button
            onClick={() => setPrimaryGoal('water')}
            className={`p-2 text-xs rounded-lg ${
              primaryGoal === 'water'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            Water Conservation
          </button>
        </div>
      </div>
      
      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <label>Yield Importance</label>
            <span>{sliders.yieldWeight}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={sliders.yieldWeight}
            onChange={(e) => handleSliderChange('yieldWeight', parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>
        
        <div>
          <div className="flex justify-between text-sm mb-1">
            <label>Profit Margin</label>
            <span>{sliders.profitWeight}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={sliders.profitWeight}
            onChange={(e) => handleSliderChange('profitWeight', parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>
        
        <div>
          <div className="flex justify-between text-sm mb-1">
            <label>Sustainability</label>
            <span>{sliders.sustainabilityWeight}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={sliders.sustainabilityWeight}
            onChange={(e) => handleSliderChange('sustainabilityWeight', parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>
        
        <div>
          <div className="flex justify-between text-sm mb-1">
            <label>Water Conservation</label>
            <span>{sliders.waterConservationWeight}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={sliders.waterConservationWeight}
            onChange={(e) => handleSliderChange('waterConservationWeight', parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>
      
      <div className="mt-6">
        <button className="w-full py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700">
          Generate AI Layout Suggestions
        </button>
      </div>
      
      <div className="mt-3">
        <button className="w-full py-2 text-sm font-medium bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
          Save Current Layout
        </button>
      </div>
    </div>
  );
}
