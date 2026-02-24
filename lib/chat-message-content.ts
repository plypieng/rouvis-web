export type ParsedChatMessageContent = {
  contentText: string;
  imageUrl?: string;
};

type StructuredTextPart = {
  type: 'text';
  text?: unknown;
};

type StructuredImagePart = {
  type: 'image_url';
  image_url?: {
    url?: unknown;
  };
};

export function parseStoredChatMessageContent(content: unknown): ParsedChatMessageContent {
  if (typeof content !== 'string') {
    return { contentText: String(content ?? '') };
  }

  const trimmed = content.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) {
    return { contentText: content };
  }

  try {
    const parsed = JSON.parse(content) as unknown;
    if (!Array.isArray(parsed)) {
      return { contentText: content };
    }

    let imageUrl: string | undefined;
    const textParts: string[] = [];

    for (const part of parsed) {
      if (!part || typeof part !== 'object') continue;

      const textPart = part as StructuredTextPart;
      if (textPart.type === 'text' && typeof textPart.text === 'string') {
        textParts.push(textPart.text);
        continue;
      }

      const imagePart = part as StructuredImagePart;
      if (imagePart.type === 'image_url') {
        const url = typeof imagePart.image_url?.url === 'string'
          ? imagePart.image_url.url.trim()
          : '';
        if (url) {
          imageUrl = url;
        }
      }
    }

    return {
      contentText: textParts.join(' ').trim(),
      ...(imageUrl ? { imageUrl } : {}),
    };
  } catch {
    return { contentText: content };
  }
}
