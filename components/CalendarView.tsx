'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, parseISO } from 'date-fns';

type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  type: 'planting' | 'harvesting' | 'fertilizing' | 'watering' | 'maintenance';
  crop?: string;
  location?: string;
};

interface Task {
  id?: string;
  title: string;
  description?: string;
  dueAt: Date;
  fieldId?: string;
  fieldName?: string;
  priority?: 'low' | 'medium' | 'high';
  status: 'pending' | 'scheduled' | 'cancelled';
}

interface CalendarViewProps {
  tasks?: Task[];
}

export function CalendarView({ tasks = [] }: CalendarViewProps) {
  const t = useTranslations();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week'>('month');
  
  // Convert tasks to calendar events
  const taskEvents: CalendarEvent[] = tasks.map(task => ({
    id: task.id || `task-${Date.now()}`,
    title: task.title,
    date: format(task.dueAt, 'yyyy-MM-dd'),
    type: 'watering', // Default type from demo tasks
    location: task.fieldName,
  }));

  // Generate daily events for all visible days including previous/next month
  const generateMonthlyEvents = (): CalendarEvent[] => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    
    // Calculate first visible day (including previous month days)
    const firstDayOfWeek = new Date(monthStart);
    firstDayOfWeek.setDate(monthStart.getDate() - monthStart.getDay());
    
    // Calculate last visible day (including next month days)
    const lastDayOfWeek = new Date(monthEnd);
    lastDayOfWeek.setDate(monthEnd.getDate() + (6 - monthEnd.getDay()));
    
    const allVisibleDays = eachDayOfInterval({ start: firstDayOfWeek, end: lastDayOfWeek });
    
    const dailyEvents: CalendarEvent[] = [];
    const eventTypes: Array<'planting' | 'harvesting' | 'fertilizing' | 'watering' | 'maintenance'> =
      ['watering', 'maintenance', 'fertilizing', 'planting', 'harvesting'];
    
    allVisibleDays.forEach((day, index) => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const eventType = eventTypes[index % eventTypes.length];
      
      // Add 1-2 events per day
      dailyEvents.push({
        id: `daily-${dayStr}-1`,
        title: eventType === 'watering' ? '潅水' :
               eventType === 'fertilizing' ? '施肥' :
               eventType === 'planting' ? '種まき' :
               eventType === 'harvesting' ? '収穫' : '点検',
        date: dayStr,
        type: eventType,
        location: 'B圃場',
      });
      
      // Add second event for some days
      if (index % 3 === 0) {
        const secondType = eventTypes[(index + 1) % eventTypes.length];
        dailyEvents.push({
          id: `daily-${dayStr}-2`,
          title: secondType === 'watering' ? '見回り' :
                 secondType === 'fertilizing' ? '追肥' :
                 secondType === 'planting' ? '育苗' :
                 secondType === 'harvesting' ? '選別' : '整備',
          date: dayStr,
          type: secondType,
          location: 'A圃場',
        });
      }
    });
    
    return dailyEvents;
  };

  // Mock data for demonstration (merged with task events and daily events)
  const events: CalendarEvent[] = [
    ...taskEvents,
    ...generateMonthlyEvents(),
  ];

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'planting':
        return 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-300';
      case 'harvesting':
        return 'bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 border-yellow-300';
      case 'fertilizing':
        return 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 border-amber-300';
      case 'watering':
        return 'bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 border-blue-300';
      case 'maintenance':
        return 'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 border-gray-300';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'planting':
        return '🌱';
      case 'harvesting':
        return '🌾';
      case 'fertilizing':
        return '🧪';
      case 'watering':
        return '💧';
      case 'maintenance':
        return '🔧';
      default:
        return '📋';
    }
  };

  const previousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const nextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const goToCurrentMonth = () => {
    setCurrentDate(new Date());
  };

  // Generate days for the current month view including previous/next month days
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  
  // Get first day of week (including previous month days)
  const firstDayOfWeek = new Date(monthStart);
  firstDayOfWeek.setDate(monthStart.getDate() - monthStart.getDay());
  
  // Get last day of week (including next month days)
  const lastDayOfWeek = new Date(monthEnd);
  lastDayOfWeek.setDate(monthEnd.getDate() + (6 - monthEnd.getDay()));
  
  // Include all visible days
  const days = eachDayOfInterval({ start: firstDayOfWeek, end: lastDayOfWeek });

  // Get events for a specific day
  const getEventsForDay = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return events.filter(event => event.date === dayStr);
  };

  return (
    <div className="h-full w-full" style={{ scrollbarGutter: 'stable' }}>
      <div className="flex justify-between items-center mb-6 bg-gradient-to-r from-blue-600 via-cyan-600 to-emerald-600 text-white p-4 rounded-xl shadow-lg">
        <button
          onClick={previousMonth}
          className="p-2 rounded-lg hover:bg-white/20 transition-all transform hover:scale-110"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-wide">
            {format(currentDate, 'yyyy年 M月')}
          </h2>
          <p className="text-xs mt-1 opacity-90">AI自動生成スケジュール</p>
        </div>
        <button
          onClick={nextMonth}
          className="p-2 rounded-lg hover:bg-white/20 transition-all transform hover:scale-110"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="w-full">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-2 mb-3">
          {[
            { name: t('weather.sun'), color: 'text-red-600' },
            { name: t('weather.mon'), color: 'text-gray-700' },
            { name: t('weather.tue'), color: 'text-gray-700' },
            { name: t('weather.wed'), color: 'text-gray-700' },
            { name: t('weather.thu'), color: 'text-gray-700' },
            { name: t('weather.fri'), color: 'text-gray-700' },
            { name: t('weather.sat'), color: 'text-blue-600' }
          ].map((day) => (
            <div key={day.name} className={`text-sm font-bold text-center py-2 ${day.color}`}>
              {day.name}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
         <div className="grid grid-cols-7 gap-2">
           {days.map((day) => {
             const dayEvents = getEventsForDay(day);
             const isCurrentMonth = isSameMonth(day, currentDate);
             return (
               <div
                 key={day.toString()}
                 className={`h-28 p-2 border-2 rounded-xl transition-all transform hover:scale-105 hover:shadow-xl cursor-pointer ${
                   isToday(day)
                     ? 'bg-gradient-to-br from-emerald-50 via-green-50 to-cyan-50 border-emerald-400 shadow-lg ring-2 ring-emerald-300'
                     : isCurrentMonth
                     ? 'bg-white border-gray-200 hover:border-blue-300 shadow-sm'
                     : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200 opacity-50 hover:opacity-75'
                 }`}
               >
                <div className="flex flex-col items-center w-full h-full overflow-hidden">
                  {/* Date */}
                  <span
                    className={`text-sm font-bold inline-flex items-center justify-center rounded-full w-7 h-7 ${
                      isToday(day)
                        ? 'bg-gradient-to-br from-emerald-600 to-green-600 text-white shadow-md'
                        : 'text-gray-700'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                  
                  {/* Event Count */}
                  {dayEvents.length > 0 && (
                    <span className="text-[9px] font-semibold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full whitespace-nowrap">
                      {dayEvents.length}件
                    </span>
                  )}
                  
                  {/* Icons Grid */}
                  {dayEvents.length > 0 && (
                    <div className="flex flex-wrap gap-0.5 justify-center mt-1">
                      {dayEvents.slice(0, 3).map((event) => (
                        <span
                          key={event.id}
                          className="text-sm"
                          title={event.title}
                        >
                          {getTypeIcon(event.type)}
                        </span>
                      ))}
                      {dayEvents.length > 3 && (
                        <span className="text-[8px] font-semibold text-blue-600 pl-0.5">
                          +{dayEvents.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
