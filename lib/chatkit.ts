export const CREATE_SESSION_ENDPOINT = '/api/chatkit/session';

export const WORKFLOW_ID =
  process.env.NEXT_PUBLIC_CHATKIT_WORKFLOW_ID?.trim() ?? '';

export const CHATKIT_API_BASE =
  process.env.CHATKIT_API_BASE?.trim() || 'https://api.openai.com';

export function isWorkflowConfigured(): boolean {
  return WORKFLOW_ID.length > 0;
}
