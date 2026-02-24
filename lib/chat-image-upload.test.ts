import { describe, expect, it } from 'vitest';
import {
  CHAT_IMAGE_MAX_BYTES,
  buildChatImageBlobPath,
  validateChatImageFile,
} from './chat-image-upload';

describe('validateChatImageFile', () => {
  it('accepts allowed image content type within size limit', () => {
    const result = validateChatImageFile({
      size: 1200,
      type: 'image/png',
    } as Pick<File, 'size' | 'type'>);

    expect(result).toEqual({ ok: true });
  });

  it('rejects oversized images', () => {
    const result = validateChatImageFile({
      size: CHAT_IMAGE_MAX_BYTES + 1,
      type: 'image/png',
    } as Pick<File, 'size' | 'type'>);

    expect(result).toEqual({ ok: false, reason: 'size' });
  });

  it('rejects unsupported image content types', () => {
    const result = validateChatImageFile({
      size: 1024,
      type: 'image/bmp',
    } as Pick<File, 'size' | 'type'>);

    expect(result).toEqual({ ok: false, reason: 'type' });
  });
});

describe('buildChatImageBlobPath', () => {
  it('builds a user-scoped chat blob pathname', () => {
    const path = buildChatImageBlobPath({
      userId: 'user_123',
      fileName: 'My Leaf Photo (1).PNG',
      timestamp: 1700000000000,
      nonce: 'abc123',
    });

    expect(path).toBe('chat/user_123/1700000000000-abc123-my-leaf-photo-1-.png');
  });
});
