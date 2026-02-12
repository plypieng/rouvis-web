'use client';

import { useState } from 'react';
import { toastSuccess } from '@/lib/feedback';

type ActivityType = 'planting' | 'harvesting' | 'fertilizing' | 'watering' | 'maintenance';

type ActivityFormData = {
  title: string;
  date: string;
  type: ActivityType;
  crop: string;
  location: string;
  notes: string;
};

export function ScheduleSidebar() {
  const [form, setForm] = useState<ActivityFormData>({
    title: '',
    date: new Date().toISOString().split('T')[0],
    type: 'planting',
    crop: '',
    location: '',
    notes: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real application, this would call an API to save the activity
    console.log('Scheduled activity:', form);
    toastSuccess('Activity scheduled successfully!');
    
    // Reset form
    setForm({
      title: '',
      date: new Date().toISOString().split('T')[0],
      type: 'planting',
      crop: '',
      location: '',
      notes: '',
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <h2 className="text-lg font-semibold mb-3">Schedule Activity</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Activity Title*
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              value={form.title}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-lg text-sm"
              placeholder="e.g., Plant Rice in North Field"
            />
          </div>
          
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
              Date*
            </label>
            <input
              id="date"
              name="date"
              type="date"
              required
              value={form.date}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
              Activity Type*
            </label>
            <select
              id="type"
              name="type"
              required
              value={form.type}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="planting">Planting</option>
              <option value="harvesting">Harvesting</option>
              <option value="fertilizing">Fertilizing</option>
              <option value="watering">Watering</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="crop" className="block text-sm font-medium text-gray-700 mb-1">
              Crop
            </label>
            <input
              id="crop"
              name="crop"
              type="text"
              value={form.crop}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-lg text-sm"
              placeholder="e.g., Koshihikari Rice"
            />
          </div>
          
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <input
              id="location"
              name="location"
              type="text"
              value={form.location}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-lg text-sm"
              placeholder="e.g., North Field"
            />
          </div>
          
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={3}
              className="w-full p-2 border border-gray-300 rounded-lg text-sm"
              placeholder="Any special instructions or details"
            />
          </div>
          
          <button
            type="submit"
            className="w-full py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Schedule Activity
          </button>
        </form>
      </div>
      
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <h2 className="text-lg font-semibold mb-3">AI Recommendations</h2>
        
        <div className="space-y-3">
          <div className="p-3 bg-green-50 border border-green-100 rounded-lg">
            <p className="text-sm">
              <span className="font-medium">Planting:</span> Ideal time to plant rice in your region is the next 7-10 days.
            </p>
          </div>
          
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
            <p className="text-sm">
              <span className="font-medium">Watering:</span> Schedule additional irrigation for vegetable plots in 3 days due to forecasted dry spell.
            </p>
          </div>
          
          <div className="p-3 bg-yellow-50 border border-yellow-100 rounded-lg">
            <p className="text-sm">
              <span className="font-medium">Harvesting:</span> Early vegetables in greenhouse should be ready for harvest by May 28th.
            </p>
          </div>
        </div>
        
        <button className="w-full py-2 text-sm font-medium mt-3 bg-white border border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50">
          Generate More Recommendations
        </button>
      </div>
    </div>
  );
}
