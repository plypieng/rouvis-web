'use client';

import { useCallback } from 'react';
import { ChatKit, useChatKit } from '@openai/chatkit-react';
import { useTranslations } from 'next-intl';
import {
  CREATE_SESSION_ENDPOINT,
  WORKFLOW_ID,
  isWorkflowConfigured,
} from '@/lib/chatkit';

interface RouvisChatKitProps {
  className?: string;
}

export function RouvisChatKit({ className }: RouvisChatKitProps) {
  const t = useTranslations();

  const getClientSecret = useCallback(async () => {
    if (!isWorkflowConfigured()) {
      throw new Error('NEXT_PUBLIC_CHATKIT_WORKFLOW_ID is not configured.');
    }

    const response = await fetch(CREATE_SESSION_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workflow: { id: WORKFLOW_ID },
        chatkit_configuration: {
          file_upload: { enabled: true },
        },
      }),
    });

    const raw = await response.text();
    let payload: Record<string, unknown> = {};
    if (raw) {
      try {
        payload = JSON.parse(raw) as Record<string, unknown>;
      } catch (error) {
        console.error('Failed to parse ChatKit session response', error);
      }
    }

    if (!response.ok) {
      const message =
        (typeof payload.error === 'string' && payload.error) ||
        response.statusText ||
        'Failed to create ChatKit session';
      throw new Error(message);
    }

    const secret = payload?.client_secret;
    if (typeof secret !== 'string' || secret.length === 0) {
      throw new Error('Missing client secret in ChatKit session response.');
    }

    return secret;
  }, []);

  const { control } = useChatKit({
    api: { getClientSecret },
    theme: {
      colorScheme: 'light',
      color: {
        accent: { primary: '#16a34a', level: 2 },
      },
      radius: 'round',
      density: 'normal',
      typography: {
        fontFamily: 'Inter, system-ui, sans-serif',
      },
    },
    startScreen: {
      greeting:
        t('chat.greeting') ||
        'Hi! I am the ROuvis farming assistant for Niigata.',
      prompts: [
        {
          name: 'watering',
          prompt:
            t('chat.prompts.watering') ||
            'Help me log or plan irrigation work.',
          icon: 'droplets',
        },
        {
          name: 'pests',
          prompt:
            t('chat.prompts.pests') ||
            'I want guidance on pest management.',
          icon: 'bug',
        },
        {
          name: 'planning',
          prompt:
            t('chat.prompts.planning') ||
            'Work with me on a crop plan.',
          icon: 'calendar',
        },
        {
          name: 'weather',
          prompt:
            t('chat.prompts.weather') ||
            'Summarize JMA weather risks for my fields.',
          icon: 'cloud',
        },
      ],
    },
    composer: {
      placeholder:
        t('chat.placeholder') ||
        'Ask a question or record a farming task...',
      tools: [
        {
          id: 'attach-field',
          label: t('chat.tools.attach_field') || 'Select field',
          icon: 'map-pin',
          pinned: true,
        },
        {
          id: 'attach-photo',
          label: t('chat.tools.attach_photo') || 'Attach photo',
          icon: 'square-image',
          pinned: true,
        },
      ],
    },
    header: {
      customButtonLeft: {
        icon: 'sparkle',
        onClick: () => {
          console.log('Open farming settings');
        },
      },
    },
    onClientTool: async (toolCall) => {
      switch (toolCall.name) {
        case 'attach-field':
          // TODO: Open field selector modal
          return { field_selected: true };
        case 'attach-photo':
          // TODO: Open file picker for photos
          return { photo_attached: true };
        default:
          throw new Error(`Unknown tool: ${toolCall.name}`);
      }
    },
    onThreadChange: ({ threadId }) => {
      console.log('Thread changed:', threadId);
    },
    onResponseStart: () => {
      console.log('AI response starting');
    },
    onResponseEnd: () => {
      console.log('AI response completed');
    },
    locale: 'ja',
  });

  return (
    <ChatKit
      control={control}
      className={className || 'h-[600px] w-full'}
    />
  );
}
