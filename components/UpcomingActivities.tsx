'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

type Activity = {
  id: string;
  title: string;
  date: string;
  time: string;
  type: string;
  location: string;
  priority: 'high' | 'medium' | 'low';
};

export function UpcomingActivities() {
  const t = useTranslations();
  
  // Mock data for demonstration
  const activities: Activity[] = [
    {
      id: '1',
      title: t('activities.rice_field_irrigation'),
      date: t('weather.today'),
      time: '2:00 PM',
      type: t('activity_types.watering'),
      location: t('locations.north_field'),
      priority: 'high',
    },
    {
      id: '2',
      title: t('activities.apply_organic_fertilizer'),
      date: t('activities.tomorrow'),
      time: '9:00 AM',
      type: t('activity_types.fertilizing'),
      location: t('locations.vegetable_garden'),
      priority: 'medium',
    },
    {
      id: '3',
      title: t('activities.harvest_early_vegetables'),
      date: 'May 20',
      time: '7:00 AM',
      type: t('activity_types.harvesting'),
      location: t('locations.east_plot'),
      priority: 'medium',
    },
    {
      id: '4',
      title: t('activities.equipment_maintenance'),
      date: 'May 21',
      time: '3:30 PM',
      type: t('activity_types.maintenance'),
      location: t('locations.workshop'),
      priority: 'low',
    },
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getActivityIcon = (type: string) => {
    const watering = t('activity_types.watering');
    const fertilizing = t('activity_types.fertilizing');
    const harvesting = t('activity_types.harvesting');
    const planting = t('activity_types.planting');
    const maintenance = t('activity_types.maintenance');
    
    switch (type) {
      case watering:
        return '💧';
      case fertilizing:
        return '🧪';
      case harvesting:
        return '🌾';
      case planting:
        return '🌱';
      case maintenance:
        return '🔧';
      default:
        return '📋';
    }
  };

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="flex items-start p-3 border border-gray-100 rounded-lg hover:bg-gray-50"
        >
          <div className="bg-gray-100 rounded-full w-10 h-10 flex items-center justify-center text-xl mr-3">
            {getActivityIcon(activity.type)}
          </div>
          <div className="flex-1">
            <div className="flex justify-between">
              <h3 className="font-medium">{activity.title}</h3>
              <span
                className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(
                  activity.priority
                )}`}
              >
                {t(`priorities.${activity.priority}`)}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {activity.date} at {activity.time}
            </p>
            <p className="text-xs text-gray-500 mt-1">{activity.location}</p>
          </div>
        </div>
      ))}
      
      <div className="pt-2">
        <Link href="/calendar" className="text-primary-600 text-sm font-medium hover:underline flex items-center justify-center">
          {t('calendar.view_full_calendar')}
          <span className="ml-1">→</span>
        </Link>
      </div>
    </div>
  );
}
