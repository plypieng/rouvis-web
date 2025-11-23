'use client';

import { useState, useRef, type FormEvent, type ChangeEvent } from 'react';

type ChatMessage = {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  attachments?: { type: string; url: string; name: string }[];
};

export function WebChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      content:
        "Hello! I'm your farming assistant for Niigata. How can I help you with strategic farming planning?",
      sender: 'ai',
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAttaching, setIsAttaching] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();

    if (!inputMessage.trim() && !isAttaching) {
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: inputMessage.trim(),
      sender: 'user',
      timestamp: new Date(),
      attachments: isAttaching
        ? [
            {
              type: 'image',
              url: '/soil-analysis.jpg',
              name: 'Soil Analysis Report.jpg',
            },
          ]
        : undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsAttaching(false);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          history: messages.slice(-10).map(message => ({
            role: message.sender === 'ai' ? 'assistant' : 'user',
            content: message.content,
          })),
          sessionId: sessionId ?? undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data: {
        response?: string;
        model?: string | null;
        sessionId?: string | null;
        citations?: Array<{ source: string; page?: number; confidence?: number; text?: string }>;
        error?: string;
      } = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.sessionId) {
        setSessionId(data.sessionId);
      }

      const aiMessage: ChatMessage = {
        id: `${Date.now() + 1}`,
        content:
          data.response?.trim() ||
          'Sorry, I could not generate a response. Please try again.',
        sender: 'ai',
        timestamp: new Date(),
      };

      const newMessages: ChatMessage[] = [aiMessage];

      // Append citations as a follow-up evidence message (if available)
      if (Array.isArray(data.citations) && data.citations.length > 0) {
        const evidenceLines = data.citations.slice(0, 5).map((c) => {
          const src = c.source || 'Source';
          const page = typeof c.page === 'number' ? ` p.${c.page}` : '';
          const conf = typeof c.confidence === 'number' ? ` (conf ${Math.round((c.confidence || 0) * 100)}%)` : '';
          const excerpt = c.text ? `\n- ${c.text.substring(0, 160)}${c.text.length > 160 ? '…' : ''}` : '';
          return `• ${src}${page}${conf}${excerpt}`;
        });
        newMessages.push({
          id: `${Date.now() + 2}`,
          content: `参考資料:\n${evidenceLines.join('\n')}`,
          sender: 'ai',
          timestamp: new Date(),
        });
      }

      setMessages(prev => [...prev, ...newMessages]);
    } catch (error) {
      console.error('Error sending message', error);

      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content:
          "I'm sorry, I couldn't process your message. Please try again later.",
        sender: 'ai',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setIsAttaching(true);
      event.target.value = '';
    }
  };

  return (
    <>
      {/* Mobile-optimized header */}
      <div className="bg-primary-50 mobile-spacing border-b border-primary-100">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xl mr-3">
            AI
          </div>
          <div>
            <h2 className="text-mobile-base font-medium">Farming Strategy Assistant</h2>
            <p className="text-mobile-sm text-gray-600">
              Powered by GPT-4 with agricultural expertise
            </p>
          </div>
        </div>
      </div>

      {/* Mobile-optimized chat area with smooth scrolling */}
      <div className="flex-1 overflow-y-auto mobile-scroll p-3 sm:p-4 space-y-4 sm:space-y-6">
        {messages.map(message => (
          <div
            key={message.id}
            className={`flex ${
              message.sender === 'user' ? 'justify-end' : 'justify-start'
            } mb-3 sm:mb-4`}
          >
            {message.sender === 'ai' && (
              <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                AI
              </div>
            )}
            <div
              className={`mobile-message-bubble ${
                message.sender === 'user'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white border border-gray-200'
              }`}
            >
              {message.attachments && message.attachments.length > 0 && (
                <div className="mb-2">
                  {message.attachments.map((attachment, index) => (
                    <div
                      key={index}
                      className="bg-white rounded p-2 border border-gray-200 text-gray-700 text-mobile-sm flex items-center mb-2"
                    >
                      <span className="mr-2">📎</span>
                      <span>{attachment.name}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="whitespace-pre-wrap text-mobile-sm leading-relaxed">{message.content}</div>

              <div className="text-mobile-sm mt-2 opacity-70 text-right">
                {message.timestamp.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
            {message.sender === 'user' && (
              <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center ml-2 mt-1 flex-shrink-0">
                You
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start mb-3 sm:mb-4">
            <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center mr-2 flex-shrink-0">
              AI
            </div>
            <div className="bg-white border border-gray-200 rounded-lg mobile-message-bubble">
              <div className="flex space-x-2">
                <div className="w-3 h-3 bg-gray-300 rounded-full animate-bounce"></div>
                <div className="w-3 h-3 bg-gray-300 rounded-full animate-bounce delay-100"></div>
                <div className="w-3 h-3 bg-gray-300 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Mobile-optimized input area */}
      <form onSubmit={sendMessage} className="mobile-chat-input">
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={handleAttachClick}
            className={`touch-target rounded-full mobile-tap ${
              isAttaching
                ? 'bg-primary-100 text-primary-700'
                : 'hover:bg-gray-100 text-gray-500'
            }`}
            aria-label="Attach file"
          >
            📎
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
          />

          {isAttaching && (
            <div className="bg-primary-50 text-primary-700 text-mobile-sm px-2 py-1 rounded flex-shrink-0">
              File attached
            </div>
          )}

          <input
            type="text"
            value={inputMessage}
            onChange={event => setInputMessage(event.target.value)}
            placeholder="Type a farming question or log here..."
            className="mobile-input flex-1"
            disabled={isLoading}
            autoComplete="off"
            autoCapitalize="sentences"
            autoCorrect="on"
          />
          <button
            type="submit"
            disabled={isLoading || (!isAttaching && !inputMessage.trim())}
            className={`mobile-btn-primary flex-shrink-0 ${
              isLoading || (!isAttaching && !inputMessage.trim())
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : ''
            }`}
            aria-label="Send message"
          >
            <span className="text-mobile-sm">Send</span>
          </button>
        </div>
      </form>
    </>
  );
}
