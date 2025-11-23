'use client';

import { useState, useEffect, useRef, ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Bot, User, Loader2 } from 'lucide-react';

// Define the structure for a chat message
type ChatMessage = {
  id: number;
  sender: 'user' | 'ai';
  text: ReactNode;
  // We can add more properties like tool calls later
  tool_calls?: { name: string; args: any }[];
};

// --- Mock MCP Integration ---
// This simulates fetching data from your backend services.

// Mock weather data for Niigata
const getMockWeatherData = async () => {
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
  return {
    temperature: '25°C',
    humidity: '70%',
    precipitation: '10%',
    forecast: '今後数週間は晴れの日が多く、気温は安定する見込みです。', // "Sunny days are expected for the next few weeks with stable temperatures."
  };
};

// Mock geo data for the user's farm
const getMockGeoData = async () => {
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
  return {
    soil_composition: '沖積土壌、肥沃度が高い',
    north_field: '水稲栽培に最適',
    south_field: '日当たりが良く、野菜栽培に適している',
  };
};

// --- Main Component ---

export function AICropRecommendations() {
  const t = useTranslations();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);


  // Initial greeting from the AI
    useEffect(() => {
    setMessages([
      {
        id: 1,
        sender: 'ai',
        text: t('chat.greeting'),
      },
    ]);
  }, [t]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const newUserMessage: ChatMessage = {
      id: Date.now(),
      sender: 'user',
      text,
    };
    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);

    // --- AI Response Simulation ---
    // This simulates the AI thinking, calling tools, and forming a response.
    try {
      // 1. Simulate calling MCP for weather and geo data
            const thinkingMessage: ChatMessage = {
        id: Date.now() + 1,
        sender: 'ai',
        text: t('chat.acknowledgement'),
        tool_calls: [
          { name: 'getWeatherData', args: { location: 'Niigata' } },
          { name: 'getGeoData', args: { farmId: 'user_farm_1' } },
        ],
      };
      setMessages(prev => [...prev, thinkingMessage]);
      
      const [weatherData, geoData] = await Promise.all([
        getMockWeatherData(),
        getMockGeoData(),
      ]);

      // 2. Simulate AI generating a recommendation based on the data
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate thinking time

            const aiResponse: ChatMessage = {
        id: Date.now() + 2,
        sender: 'ai',
        text: [
          t('chat.recommendation_intro', {
            temperature: weatherData.temperature,
            forecast: weatherData.forecast,
            soil_composition: geoData.soil_composition,
          }),
          '\n\n1. ' + t('chat.recommendation_item_1'),
          '2. ' + t('chat.recommendation_item_2'),
          '3. ' + t('chat.recommendation_item_3'),
          '\n\n' + t('chat.recommendation_outro'),
        ].join('\n'),
      };
      
      // Replace the "thinking" message with the final response
      setMessages(prev => [...prev.slice(0, -1), aiResponse]);

    } catch (error) {
            const errorMessage: ChatMessage = {
        id: Date.now() + 3,
        sender: 'ai',
        text: t('chat.error'),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 flex flex-col h-[500px]">
      <div className="p-3 border-b border-gray-200">
        <h3 className="font-medium text-center">{t('dashboard.crop_recommendations')}</h3>
      </div>
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {messages.map(msg => (
          <div key={msg.id} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
            {msg.sender === 'ai' && <Bot className="w-6 h-6 text-primary-600" />}
            <div className={`rounded-lg px-3 py-2 max-w-sm ${msg.sender === 'ai' ? 'bg-gray-100' : 'bg-primary-600 text-white'}`}>
              <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
              {msg.tool_calls && (
                <div className="mt-2 p-2 border-t border-gray-300">
                  <p className="text-xs font-semibold text-gray-500">ツール呼び出し:</p>
                  {msg.tool_calls.map(call => (
                     <p key={call.name} className="text-xs text-gray-500 font-mono">{`mcp.${call.name}(${JSON.stringify(call.args)})`}</p>
                  ))}
                </div>
              )}
            </div>
            {msg.sender === 'user' && <User className="w-6 h-6" />}
          </div>
        ))}
        {isLoading && (
          <div className="flex items-start gap-3">
            <Bot className="w-6 h-6 text-primary-600" />
            <div className="rounded-lg px-3 py-2 bg-gray-100 flex items-center">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              <p className="text-sm">{t('chat.thinking')}</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-3 border-t border-gray-200">
        <form
          onSubmit={e => {
            e.preventDefault();
            const input = e.currentTarget.elements.namedItem('message') as HTMLInputElement;
            handleSendMessage(input.value);
            input.value = '';
          }}
        >
          <input
            name="message"
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder={t('chat.placeholder')}
            disabled={isLoading}
          />
        </form>
      </div>
    </div>
  );
}
