export type CockpitPanelMode = 'chat' | 'calendar';

export type ProjectTaskItem = {
  id: string;
  title: string;
  dueDate: string;
  status: string;
  description?: string;
  priority?: string;
};

export type TaskMovePayload = {
  taskId: string;
  toDate: string;
};

export type QuickApplyState = {
  status: 'idle' | 'running' | 'success' | 'error';
  reason?: string;
};

export type QuickApplyResult = {
  applied: boolean;
  reason?: string;
};
