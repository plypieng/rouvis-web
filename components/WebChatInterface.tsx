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

      setMessages(prev => [...prev, aiMessage]);
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
      <div className="bg-primary-50 p-4 border-b border-primary-100">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xl mr-3">
            AI
          </div>
          <div>
            <h2 className="font-medium">Farming Strategy Assistant</h2>
            <p className="text-sm text-gray-600">
              Powered by GPT-4 with agricultural expertise
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map(message => (
          <div
            key={message.id}
            className={`flex ${
              message.sender === 'user' ? 'justify-end' : 'justify-start'
            } mb-4`}
          >
            {message.sender === 'ai' && (
              <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center mr-2 mt-1">
                AI
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-lg p-4 ${
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
                      className="bg-white rounded p-2 border border-gray-200 text-gray-700 text-sm flex items-center mb-2"
                    >
                      <span className="mr-2">📎</span>
                      <span>{attachment.name}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="whitespace-pre-wrap">{message.content}</div>

              <div className="text-xs mt-2 opacity-70 text-right">
                {message.timestamp.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
            {message.sender === 'user' && (
              <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center ml-2 mt-1">
                You
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start mb-4">
            <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center mr-2">
              AI
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4 max-w-[80%]">
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

      <form onSubmit={sendMessage} className="p-4 border-t border-gray-200">
        <div className="flex items-center">
          <button
            type="button"
            onClick={handleAttachClick}
            className={`p-2 rounded-full ${
              isAttaching
                ? 'bg-primary-100 text-primary-700'
                : 'hover:bg-gray-100 text-gray-500'
            }`}
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
            <div className="ml-2 bg-primary-50 text-primary-700 text-sm px-2 py-1 rounded">
              File attached
            </div>
          )}

          <input
            type="text"
            value={inputMessage}
            onChange={event => setInputMessage(event.target.value)}
            placeholder="Type a farming question or log here..."
            className="flex-1 ml-2 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || (!isAttaching && !inputMessage.trim())}
            className={`ml-2 p-3 rounded-lg ${
              isLoading || (!isAttaching && !inputMessage.trim())
                ? 'bg-gray-200 text-gray-400'
                : 'bg-primary-600 hover:bg-primary-700 text-white'
            }`}
          >
            <span>Send</span>
          </button>
        </div>
      </form>
    </>
  );
}
