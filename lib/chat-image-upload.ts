export const CHAT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export const CHAT_IMAGE_ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const;

type ChatImageValidationResult =
  | { ok: true }
  | { ok: false; reason: 'size' | 'type' };

export function validateChatImageFile(file: Pick<File, 'size' | 'type'>): ChatImageValidationResult {
  if (file.size > CHAT_IMAGE_MAX_BYTES) {
    return { ok: false, reason: 'size' };
  }

  if (!CHAT_IMAGE_ALLOWED_CONTENT_TYPES.includes(file.type as (typeof CHAT_IMAGE_ALLOWED_CONTENT_TYPES)[number])) {
    return { ok: false, reason: 'type' };
  }

  return { ok: true };
}

function sanitizeFileName(fileName: string): string {
  const baseName = fileName.trim().toLowerCase();
  const replaced = baseName.replace(/[^a-z0-9._-]/g, '-').replace(/-+/g, '-');
  const collapsed = replaced.replace(/^-+/, '').replace(/-+$/, '');
  return collapsed || 'image';
}

export function buildChatImageBlobPath(params: {
  userId: string;
  fileName: string;
  timestamp?: number;
  nonce?: string;
}): string {
  const userId = params.userId.trim();
  if (!userId) {
    throw new Error('userId is required for chat image upload path');
  }

  const timestamp = params.timestamp ?? Date.now();
  const nonce = params.nonce ?? crypto.randomUUID();
  const safeFileName = sanitizeFileName(params.fileName);

  return `chat/${userId}/${timestamp}-${nonce}-${safeFileName}`;
}
