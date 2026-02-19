export type ScheduleProcessingStatus = {
  message: string;
  detail?: string;
  progress?: number;
};

export type ScheduleProcessingStage =
  | 'prepare'
  | 'create_project'
  | 'generate_schedule'
  | 'validate_schedule'
  | 'fallback_tasks'
  | 'persist_tasks'
  | 'finalize'
  | 'redirect';

export function statusForScheduleStage(stage: ScheduleProcessingStage): ScheduleProcessingStatus {
  switch (stage) {
    case 'prepare':
      return {
        message: '作成を準備しています...',
        detail: '入力内容を確認しています',
        progress: 8,
      };
    case 'create_project':
      return {
        message: 'プロジェクトを作成しています...',
        detail: '圃場・作物情報を登録しています',
        progress: 22,
      };
    case 'generate_schedule':
      return {
        message: 'AIがスケジュールを作成しています...',
        detail: 'タスクの順序と時期を推論中です',
        progress: 44,
      };
    case 'validate_schedule':
      return {
        message: 'スケジュールを検証しています...',
        detail: 'タスク構造と必須項目を確認しています',
        progress: 68,
      };
    case 'fallback_tasks':
      return {
        message: 'スタータータスクへ切り替えています...',
        detail: 'AI生成が不安定のため安全な初期タスクを適用します',
        progress: 72,
      };
    case 'persist_tasks':
      return {
        message: 'タスクを保存しています...',
        detail: 'スケジュール変更を確定しています',
        progress: 86,
      };
    case 'finalize':
      return {
        message: '最終チェックをしています...',
        detail: '作成したタスクを確認しています',
        progress: 95,
      };
    case 'redirect':
      return {
        message: '仕上げています...',
        detail: '作成したプロジェクトへ移動します',
        progress: 100,
      };
    default:
      return {
        message: '処理中...',
      };
  }
}
