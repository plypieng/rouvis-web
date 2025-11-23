import { DashboardCardProps } from '../types';

export function DashboardCard({ 
  title, 
  value, 
  trend, 
  trendType, 
  icon,
  children 
}: DashboardCardProps) {
  const iconMap: Record<string, string> = {
    plant: '🌱',
    growth: '📈',
    chart: '💰',
    weather: '🌤️',
    calendar: '📅',
    water: '💧',
  };

  const trendColor = {
    positive: 'text-green-600',
    negative: 'text-red-600',
    neutral: 'text-gray-600',
  };

  const trendIcon = {
    positive: '↗',
    negative: '↘',
    neutral: '→',
  };

  // If children are provided, render the card with children content
  if (children) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold mb-4">{title}</h2>
        {children}
      </div>
    );
  }

  // Otherwise render the metrics card with value and trend
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {trend && trendType && (
            <p className={`text-sm mt-2 flex items-center ${trendColor[trendType as keyof typeof trendColor] || 'text-gray-600'}`}>
              <span className="mr-1">{trendIcon[trendType as keyof typeof trendIcon] || '→'}</span>
              {trend}
            </p>
          )}
        </div>
        {icon && (
          <div className="bg-primary-100 rounded-full p-3 text-primary-700 text-xl">
            {(icon && iconMap[icon]) || '📊'}
          </div>
        )}
      </div>
    </div>
  );
}
