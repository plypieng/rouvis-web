import { describe, expect, it } from 'vitest';
import { parseStoredChatMessageContent } from './chat-message-content';

describe('parseStoredChatMessageContent', () => {
  it('returns plain text as-is', () => {
    expect(parseStoredChatMessageContent('hello world')).toEqual({
      contentText: 'hello world',
    });
  });

  it('extracts text and image URL from structured content', () => {
    const input = JSON.stringify([
      { type: 'text', text: 'Diagnosis request' },
      { type: 'image_url', image_url: { url: 'https://blob.vercel-storage.com/chat/a.png' } },
    ]);

    expect(parseStoredChatMessageContent(input)).toEqual({
      contentText: 'Diagnosis request',
      imageUrl: 'https://blob.vercel-storage.com/chat/a.png',
    });
  });

  it('falls back safely when JSON parsing fails', () => {
    expect(parseStoredChatMessageContent('[not-json')).toEqual({
      contentText: '[not-json',
    });
  });
});
