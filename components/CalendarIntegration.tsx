'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Calendar, ChevronLeft, ChevronRight, MapPin, Clock, Plus } from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'watering' | 'fertilizing' | 'harvesting' | 'planting' | 'maintenance';
  fieldName?: string;
  quantity?: number;
  unit?: string;
  note?: string;
  timestamp: Date;
  status: 'completed' | 'pending' | 'cancelled';
}

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

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: 'activity' | 'task';
  data: ActivityItem | Task;
  color: string;
}

interface CalendarIntegrationProps {
  activities?: ActivityItem[];
  tasks?: Task[];
  onFetchActivities?: () => Promise<ActivityItem[]>;
  onFetchTasks?: () => Promise<Task[]>;
  onDateSelect?: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onLogActivity?: () => void;
  onScheduleTask?: () => void;
}

export function CalendarIntegration({
  activities: initialActivities,
  tasks: initialTasks,
  onFetchActivities,
  onFetchTasks,
  onDateSelect,
  onEventClick,
  onLogActivity,
  onScheduleTask,
}: CalendarIntegrationProps) {
  const t = useTranslations();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>(initialActivities || []);
  const [tasks, setTasks] = useState<Task[]>(initialTasks || []);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'month' | 'week'>('month');

  useEffect(() => {
    if (!initialActivities && onFetchActivities) {
      fetchActivities();
    }
    if (!initialTasks && onFetchTasks) {
      fetchTasks();
    }
  }, [initialActivities, initialTasks, onFetchActivities, onFetchTasks]);

  const fetchActivities = async () => {
    if (!onFetchActivities) return;
    try {
      const fetchedActivities = await onFetchActivities();
      setActivities(fetchedActivities);
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    }
  };

  const fetchTasks = async () => {
    if (!onFetchTasks) return;
    try {
      const fetchedTasks = await onFetchTasks();
      setTasks(fetchedTasks);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'watering':
        return '💧';
      case 'fertilizing':
        return '🌱';
      case 'harvesting':
        return '🚜';
      case 'planting':
        return '🌾';
      case 'maintenance':
        return '🔧';
      default:
        return '⚡';
    }
  };

  const getActivityLabel = (type: string) => {
    const labels = {
      watering: '水やり',
      fertilizing: '肥料投入',
      harvesting: '収穫',
      planting: '植え付け',
      maintenance: 'メンテナンス',
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high':
        return '#ef4444'; // red
      case 'medium':
        return '#f59e0b'; // yellow
      default:
        return '#10b981'; // green
    }
  };

  const createCalendarEvents = (): CalendarEvent[] => {
    const events: CalendarEvent[] = [];

    // Add activities
    activities.forEach(activity => {
      events.push({
        id: `activity-${activity.id}`,
        title: getActivityLabel(activity.type),
        date: new Date(activity.timestamp),
        type: 'activity',
        data: activity,
        color: activity.status === 'completed' ? '#10b981' : '#6b7280',
      });
    });

    // Add tasks
    tasks.forEach(task => {
      events.push({
        id: `task-${task.id}`,
        title: task.title,
        date: new Date(task.dueAt),
        type: 'task',
        data: task,
        color: task.status === 'scheduled' ? '#3b82f6' : getPriorityColor(task.priority),
      });
    });

    return events;
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add previous month's days to fill the first week
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i);
      days.push({
        date: prevDate,
        isCurrentMonth: false,
        events: [],
      });
    }

    // Add current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayEvents = createCalendarEvents().filter(event =>
        event.date.toDateString() === date.toDateString()
      );

      days.push({
        date,
        isCurrentMonth: true,
        events: dayEvents,
      });
    }

    // Add next month's days to fill the last week
    const remainingCells = 42 - days.length; // 6 weeks * 7 days
    for (let i = 1; i <= remainingCells; i++) {
      const nextDate = new Date(year, month + 1, i);
      days.push({
        date: nextDate,
        isCurrentMonth: false,
        events: [],
      });
    }

    return days;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    onDateSelect?.(date);
  };

  const handleEventClick = (event: CalendarEvent) => {
    onEventClick?.(event);
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
    });
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">カレンダー</h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-medium text-gray-900 min-w-[120px] text-center">
              {formatMonthYear(currentDate)}
            </span>
            <button
              onClick={() => navigateMonth('next')}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={goToToday}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            今日
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onLogActivity}
            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            活動記録
          </button>
          <button
            onClick={onScheduleTask}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            タスク予定
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 mb-4">
        {/* Week day headers */}
        {weekDays.map((day, index) => (
          <div
            key={day}
            className={`p-2 text-center text-sm font-medium ${
              index === 0 ? 'text-red-600' : index === 6 ? 'text-blue-600' : 'text-gray-700'
            }`}
          >
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {daysInMonth.map((day, index) => (
          <div
            key={index}
            onClick={() => handleDateClick(day.date)}
            className={`min-h-[100px] p-2 border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${
              !day.isCurrentMonth ? 'text-gray-400 bg-gray-50' : ''
            } ${
              selectedDate && day.date.toDateString() === selectedDate.toDateString()
                ? 'ring-2 ring-blue-500 bg-blue-50'
                : ''
            } ${
              day.date.toDateString() === new Date().toDateString()
                ? 'bg-blue-100 border-blue-300'
                : ''
            }`}
          >
            <div className={`text-sm font-medium mb-1 ${
              day.date.getDay() === 0 ? 'text-red-600' :
              day.date.getDay() === 6 ? 'text-blue-600' : 'text-gray-900'
            }`}>
              {day.date.getDate()}
            </div>

            {/* Events */}
            <div className="space-y-1">
              {day.events.slice(0, 3).map((event) => (
                <div
                  key={event.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEventClick(event);
                  }}
                  className="text-xs p-1 rounded cursor-pointer hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: event.color + '20', borderLeft: `3px solid ${event.color}` }}
                  title={event.title}
                >
                  <div className="truncate font-medium" style={{ color: event.color }}>
                    {event.type === 'activity' ? getActivityIcon((event.data as ActivityItem).type) : '📅'} {event.title}
                  </div>
                </div>
              ))}
              {day.events.length > 3 && (
                <div className="text-xs text-gray-500 pl-1">
                  +{day.events.length - 3} 件
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Selected Date Details */}
      {selectedDate && (
        <div className="border-t pt-4">
          <h4 className="font-medium text-gray-900 mb-3">
            {selectedDate.toLocaleDateString('ja-JP', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long',
            })}
          </h4>

          <div className="space-y-2">
            {createCalendarEvents()
              .filter(event => event.date.toDateString() === selectedDate.toDateString())
              .map((event) => (
                <div
                  key={event.id}
                  onClick={() => handleEventClick(event)}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: event.color }}
                  ></div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {event.title}
                    </div>
                    <div className="text-sm text-gray-600 flex items-center gap-2">
                      {event.type === 'activity' ? (
                        <>
                          <span>{getActivityIcon((event.data as ActivityItem).type)}</span>
                          {(event.data as ActivityItem).fieldName && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {(event.data as ActivityItem).fieldName}
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          <span>📅</span>
                          {(event.data as Task).fieldName && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {(event.data as Task).fieldName}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date((event.data as Task).dueAt).toLocaleTimeString('ja-JP', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}

            {createCalendarEvents().filter(event =>
              event.date.toDateString() === selectedDate.toDateString()
            ).length === 0 && (
              <div className="text-center py-4 text-gray-500">
                この日に予定された活動やタスクはありません
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}