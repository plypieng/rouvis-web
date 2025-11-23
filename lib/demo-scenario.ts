/**
 * Demo Scenario State
 *
 * Provides in-memory data stores and helpers to power the MVP A demo narrative.
 * The data is intentionally deterministic so video recordings are repeatable.
 */

import { randomUUID } from 'crypto';

export type DemoStage = 'intro' | 'awaiting_schedule' | 'scheduled' | 'logged' | 'complete';

export interface DemoThreadState {
  stage: DemoStage;
  lastUserMessage?: string;
  createdAt: number;
}

export interface DemoTask {
  id: string;
  title: string;
  description?: string;
  field_id: string;
  fieldName: string;
  task_type: 'watering' | 'pest_control' | 'fertilizing' | 'inspection' | 'other';
  time_of_day: 'morning' | 'afternoon' | 'evening' | 'all_day';
  due_at: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'scheduled' | 'completed';
  weatherDependent?: boolean;
  estimatedTime?: string;
  completed?: boolean;
}

export interface DemoField {
  id: string;
  name: string;
  crop: string;
  area_sqm: number;
  variety?: string;
  seeding_date?: string;
  harvest_date?: string;
  growth_stage?: string;
  moisture_percent?: number;
  leaf_color?: string;
  notes?: string;
}

export interface DemoActivity {
  id: string;
  type: 'watering' | 'pest_control' | 'inspection';
  field_id: string;
  description: string;
  performed_at: string;
}

interface WeatherDay {
  date: string;
  temperature: { min: number; max: number };
  condition: string;
  icon: string;
  precipitation: number;
  humidity?: number;
  windSpeed?: number;
  windDirection?: string;
  reliability?: 'A' | 'B' | 'C';
}

interface WeatherWarning {
  type: string;
  severity: 'advisory' | 'warning' | 'emergency';
  title: string;
  description: string;
  issuedAt: string;
  areas: string[];
}

const NOVICE_THREAD_STORE = new Map<string, DemoThreadState>();

const FIELD_B_ID = 'field-b';

const fields: DemoField[] = [
  {
    id: 'field-a',
    name: 'A圃場',
    crop: 'コシヒカリ',
    area_sqm: 1200,
    variety: '新之助',
    seeding_date: '2025-04-10',
    harvest_date: '2025-09-20',
    growth_stage: '分げつ期',
    moisture_percent: 58,
    leaf_color: '濃緑',
    notes: '用水路点検予定（7/25）',
  },
  {
    id: FIELD_B_ID,
    name: 'B圃場',
    crop: 'ミニトマト',
    area_sqm: 820,
    variety: 'アイコ',
    seeding_date: '2025-05-12',
    harvest_date: '2025-08-30',
    growth_stage: '結実期',
    moisture_percent: 62,
    leaf_color: 'やや淡い',
    notes: '遮光ネット準備済み。連日の猛暑で萎れ傾向。',
  },
  {
    id: 'field-c',
    name: 'C圃場',
    crop: '枝豆',
    area_sqm: 640,
    variety: '弥彦むすめ',
    seeding_date: '2025-04-28',
    harvest_date: '2025-07-31',
    growth_stage: '収穫直前',
    moisture_percent: 70,
    leaf_color: '健康',
    notes: '週末収穫予定（直売所向け）',
  },
];

const initialTasks: DemoTask[] = [
  {
    id: 'task-morning-check',
    title: 'A圃場の朝の見回り',
    description: '収穫前の病害チェック + ライシート確認',
    field_id: 'field-a',
    fieldName: 'A圃場',
    task_type: 'inspection',
    time_of_day: 'morning',
    due_at: createDateWithOffset(0, 6),
    priority: 'medium',
    status: 'scheduled',
    weatherDependent: false,
  },
  {
    id: 'task-b-field-late',
    title: 'B圃場の支柱の緩み調整',
    description: '湿度で緩んだ支柱を締め直す',
    field_id: FIELD_B_ID,
    fieldName: 'B圃場',
    task_type: 'inspection',
    time_of_day: 'afternoon',
    due_at: createDateWithOffset(0, 15),
    priority: 'low',
    status: 'pending',
    weatherDependent: true,
  },
  {
    id: 'task-c-harvest',
    title: 'C圃場の試し収穫',
    description: '早生株を5株収穫して品質確認',
    field_id: 'field-c',
    fieldName: 'C圃場',
    task_type: 'other',
    time_of_day: 'morning',
    due_at: createDateWithOffset(1, 7),
    priority: 'medium',
    status: 'pending',
    weatherDependent: false,
  },
];

let tasksStore: DemoTask[] = [...initialTasks];
let activitiesStore: DemoActivity[] = [];

const weeklyWeather: WeatherDay[] = Array.from({ length: 7 }).map((_, idx) => {
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + idx);
  const iso = baseDate.toISOString().split('T')[0];

  if (idx === 1) {
    // Peak heat day (Wednesday assuming today Tuesday)
    return {
      date: iso,
      temperature: { min: 26, max: 37 },
      condition: '猛暑・フェーン現象',
      icon: '01d',
      precipitation: 10,
      humidity: 78,
      windSpeed: 5,
      windDirection: '南',
      reliability: 'A',
    };
  }

  if (idx === 2) {
    return {
      date: iso,
      temperature: { min: 25, max: 36 },
      condition: '蒸し暑く午後ににわか雨',
      icon: '10d',
      precipitation: 50,
      humidity: 82,
      windSpeed: 4,
      windDirection: '南東',
      reliability: 'B',
    };
  }

  return {
    date: iso,
    temperature: { min: 24 + Math.floor(Math.random() * 2), max: 33 + Math.floor(Math.random() * 3) },
    condition: idx % 2 === 0 ? '晴れ時々曇り' : '曇り',
    icon: idx % 2 === 0 ? '02d' : '03d',
    precipitation: idx % 2 === 0 ? 20 : 30,
    humidity: 68 + idx,
    windSpeed: 3 + (idx % 3),
    windDirection: idx % 2 === 0 ? '南西' : '北西',
    reliability: idx < 4 ? 'A' : 'B',
  };
});

const weatherWarnings: WeatherWarning[] = [
  {
    type: 'heat',
    severity: 'warning',
    title: '高温注意報（新潟県中越）',
    description: '体温を超える猛暑が予想されています。午前10時〜午後4時は屋外作業を控え、こまめな潅水で作物のストレスを軽減してください。',
    issuedAt: new Date().toISOString(),
    areas: ['長岡市', '三条市'],
  },
  {
    type: 'pest',
    severity: 'advisory',
    title: '灰色かび病リスク上昇',
    description: '連日の高湿で灰色かび病の発生リスクが高まっています。防除予定を1日前倒しするか、換気・除湿を強化してください。',
    issuedAt: new Date().toISOString(),
    areas: ['長岡市'],
  },
];

const nowcast = Array.from({ length: 6 }).map((_, idx) => ({
  time: createDateWithOffset(0, idx * 10),
  precipitation: idx < 3 ? 0 : idx * 2,
  intensity: idx < 3 ? 'none' : idx === 3 ? 'light' : 'moderate',
}));

const detailed = Array.from({ length: 12 }).map((_, idx) => ({
  time: createDateWithOffset(0, idx * 2),
  temperature: idx < 3 ? 28 + idx : 32 + idx,
  condition: idx < 6 ? '晴れ' : '薄曇り',
  icon: idx < 6 ? '01d' : '02d',
  precipitation: idx < 6 ? 0 : 20,
  windSpeed: 4 + Math.random() * 2,
  windDirection: idx < 6 ? '南南東' : '南東',
  humidity: idx < 6 ? 60 + idx * 2 : 75,
}));

export function isDemoModeEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || process.env.DEMO_MODE === 'true';
}

export function getDemoThreadState(threadId: string): DemoThreadState {
  const existing = NOVICE_THREAD_STORE.get(threadId);
  if (existing) {
    return existing;
  }

  const initial: DemoThreadState = {
    stage: 'intro',
    createdAt: Date.now(),
  };
  NOVICE_THREAD_STORE.set(threadId, initial);
  return initial;
}

export function updateDemoThreadStage(threadId: string, stage: DemoStage, lastUserMessage?: string) {
  NOVICE_THREAD_STORE.set(threadId, {
    ...getDemoThreadState(threadId),
    stage,
    lastUserMessage,
    createdAt: Date.now(),
  });
}

export function resetDemoThread(threadId?: string) {
  if (threadId) {
    NOVICE_THREAD_STORE.delete(threadId);
    return;
  }
  NOVICE_THREAD_STORE.clear();
}

export function getDemoFields(): DemoField[] {
  return fields;
}

export function getDemoFieldById(id: string): DemoField | undefined {
  return fields.find((field) => field.id === id);
}

export function getDemoTasks(options: {
  fieldId?: string | null;
  date?: string | null;
  startDate?: string | null;
  endDate?: string | null;
} = {}): DemoTask[] {
  const { fieldId, date, startDate, endDate } = options;

  return tasksStore.filter((task) => {
    if (fieldId && task.field_id !== fieldId) return false;
    if (date === 'today') {
      return task.due_at.slice(0, 10) === new Date().toISOString().slice(0, 10);
    }

    if (startDate && task.due_at.slice(0, 10) < startDate) {
      return false;
    }
    if (endDate && task.due_at.slice(0, 10) > endDate) {
      return false;
    }
    return true;
  });
}

export function createDemoTask(input: Partial<DemoTask>): DemoTask {
  const newTask: DemoTask = {
    id: input.id || `task-${randomUUID()}`,
    title: input.title || '新しい作業',
    description: input.description,
    field_id: input.field_id || FIELD_B_ID,
    fieldName: input.fieldName || getDemoFieldById(input.field_id || FIELD_B_ID)?.name || 'B圃場',
    task_type: input.task_type || 'other',
    time_of_day: input.time_of_day || 'all_day',
    due_at: input.due_at || new Date().toISOString(),
    priority: input.priority || 'medium',
    status: input.status || 'pending',
    weatherDependent: input.weatherDependent,
    estimatedTime: input.estimatedTime,
    completed: input.completed ?? (input.status === 'completed'),
  };

  tasksStore = [...tasksStore, newTask];
  return newTask;
}

export function updateDemoTask(id: string, updates: Partial<DemoTask>): DemoTask | null {
  let updated: DemoTask | null = null;
  tasksStore = tasksStore.map((task) => {
    if (task.id !== id) return task;

    updated = {
      ...task,
      ...updates,
      fieldName: updates.fieldName || task.fieldName,
      field_id: updates.field_id || task.field_id,
      completed: updates.completed ?? updates.status === 'completed' ?? task.completed,
    };
    return updated;
  });

  return updated;
}

export function deleteDemoTask(id: string) {
  tasksStore = tasksStore.filter((task) => task.id !== id);
}

export function scheduleHeatMitigationPlan(): DemoTask[] {
  const existingIrrigation = tasksStore.filter((task) => task.id.startsWith('task-demo-irrigation'));
  if (existingIrrigation.length > 0) {
    return existingIrrigation;
  }

  const newTasks: DemoTask[] = [
    {
      id: 'task-demo-irrigation-am',
      title: 'B圃場 朝のやさしい潅水 (10mm)',
      description: '日の出直後に軽めの潅水で根を冷やします',
      field_id: FIELD_B_ID,
      fieldName: 'B圃場',
      task_type: 'watering',
      time_of_day: 'morning',
      due_at: createDateWithOffset(0, 5),
      priority: 'high',
      status: 'scheduled',
      weatherDependent: true,
    },
    {
      id: 'task-demo-irrigation-pm',
      title: 'B圃場 夕方のミスト潅水',
      description: '日没前に葉温を下げる目的で5mm噴霧',
      field_id: FIELD_B_ID,
      fieldName: 'B圃場',
      task_type: 'watering',
      time_of_day: 'evening',
      due_at: createDateWithOffset(0, 18),
      priority: 'high',
      status: 'scheduled',
      weatherDependent: true,
    },
    {
      id: 'task-demo-pest',
      title: 'B圃場 予防防除（灰色かび）',
      description: '予定より1日前倒しで実施。午前の涼しい時間に。',
      field_id: FIELD_B_ID,
      fieldName: 'B圃場',
      task_type: 'pest_control',
      time_of_day: 'morning',
      due_at: createDateWithOffset(1, 7),
      priority: 'medium',
      status: 'scheduled',
      weatherDependent: true,
    },
  ];

  tasksStore = [...tasksStore, ...newTasks];
  return newTasks;
}

type DemoActivityInput = Omit<DemoActivity, 'id' | 'performed_at'> & {
  id?: string;
  performed_at?: string;
};

export function logDemoActivity(activity: DemoActivityInput): DemoActivity {
  const entry: DemoActivity = {
    id: activity.id || `activity-${randomUUID()}`,
    type: activity.type,
    field_id: activity.field_id,
    description: activity.description,
    performed_at: activity.performed_at || new Date().toISOString(),
  };
  activitiesStore = [...activitiesStore, entry];
  return entry;
}

export function getDemoActivities(fieldId?: string): DemoActivity[] {
  if (!fieldId) return activitiesStore;
  return activitiesStore.filter((activity) => activity.field_id === fieldId);
}

export function getDemoWeatherResponse() {
  return {
    current: {
      temperature: detailed[0].temperature,
      humidity: detailed[0].humidity,
      windSpeed: detailed[0].windSpeed,
      windDirection: detailed[0].windDirection,
      condition: detailed[0].condition,
      icon: detailed[0].icon,
      timestamp: detailed[0].time,
    },
    detailed,
    weekly: weeklyWeather.map((day) => ({
      date: day.date,
      temperature: day.temperature,
      condition: day.condition,
      icon: day.icon,
      precipitation: day.precipitation,
      reliability: day.reliability,
    })),
    nowcast,
    warnings: weatherWarnings,
    typhoons: [],
    forecast: weeklyWeather,
    temperature: detailed[0].temperature,
    humidity: detailed[0].humidity,
    windSpeed: detailed[0].windSpeed,
    condition: detailed[0].condition,
    icon: detailed[0].icon,
    timestamp: detailed[0].time,
  };
}

export function resetDemoData() {
  tasksStore = [...initialTasks];
  activitiesStore = [];
  NOVICE_THREAD_STORE.clear();
}

function createDateWithOffset(dayOffset: number, hour: number): string {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}
