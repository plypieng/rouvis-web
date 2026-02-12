export type StarterTask = {
  title: string;
  description?: string;
  dueDate: string;
  priority?: 'low' | 'medium' | 'high';
  status: 'pending' | 'completed';
  isBackfilled?: boolean;
  isAssumed?: boolean;
};

type BuildStarterTasksOptions = {
  crop: string;
  startDate?: string;
  isBackfilled?: boolean;
};

function toDateOnly(value?: string): Date {
  const parsed = value ? new Date(value) : new Date();
  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function shiftDate(base: Date, dayOffset: number): string {
  const shifted = new Date(base);
  shifted.setDate(shifted.getDate() + dayOffset);
  return shifted.toISOString().split('T')[0];
}

export function buildStarterTasks({
  crop,
  startDate,
  isBackfilled = false,
}: BuildStarterTasksOptions): StarterTask[] {
  const safeCrop = crop?.trim() || '作物';
  const today = toDateOnly();
  const plantingStart = toDateOnly(startDate);

  if (isBackfilled) {
    return [
      {
        title: `${safeCrop}の初期生育を振り返り記録`,
        description: '実施済みの初期作業を確認して記録を整えます。',
        dueDate: shiftDate(today, -3),
        priority: 'medium',
        status: 'completed',
        isBackfilled: true,
        isAssumed: true,
      },
      {
        title: `${safeCrop}の直近管理作業を確認`,
        description: '最近の潅水・施肥・観察内容をメモして履歴を揃えます。',
        dueDate: shiftDate(today, -1),
        priority: 'medium',
        status: 'completed',
        isBackfilled: true,
        isAssumed: true,
      },
      {
        title: `${safeCrop}の圃場状態を見回り`,
        description: '葉色、土壌水分、倒伏や欠株の有無を確認します。',
        dueDate: shiftDate(today, 1),
        priority: 'high',
        status: 'pending',
      },
      {
        title: `${safeCrop}の病害虫チェック`,
        description: '葉裏や株元を重点的に確認し、兆候があれば記録します。',
        dueDate: shiftDate(today, 3),
        priority: 'high',
        status: 'pending',
      },
      {
        title: `${safeCrop}の次週作業を計画`,
        description: '次の潅水・追肥・除草候補を整理して優先順位を付けます。',
        dueDate: shiftDate(today, 6),
        priority: 'medium',
        status: 'pending',
      },
    ];
  }

  return [
    {
      title: `${safeCrop}の圃場チェック`,
      description: '定植直後の株の状態と土壌水分を確認します。',
      dueDate: shiftDate(plantingStart, 0),
      priority: 'high',
      status: 'pending',
    },
    {
      title: `${safeCrop}の潅水判断`,
      description: '天候と土壌水分を見て潅水の要否を判断します。',
      dueDate: shiftDate(plantingStart, 2),
      priority: 'high',
      status: 'pending',
    },
    {
      title: `${safeCrop}の病害虫予防チェック`,
      description: '初期症状を早期に見つけるため葉裏・株元を確認します。',
      dueDate: shiftDate(plantingStart, 4),
      priority: 'medium',
      status: 'pending',
    },
    {
      title: `${safeCrop}の追肥タイミング確認`,
      description: '生育状況を見ながら追肥の必要性を判断します。',
      dueDate: shiftDate(plantingStart, 7),
      priority: 'medium',
      status: 'pending',
    },
    {
      title: `${safeCrop}の生育メモを記録`,
      description: '写真やメモを残して次回判断の材料を増やします。',
      dueDate: shiftDate(plantingStart, 9),
      priority: 'low',
      status: 'pending',
    },
  ];
}
