'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface ConfidenceIndicatorProps {
  confidence: number; // 0-1
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  variant?: 'bar' | 'ring';
  animated?: boolean;
}

export function ConfidenceIndicator({ 
  confidence, 
  size = 'md',
  showLabel = true,
  variant = 'bar',
  animated = true,
}: ConfidenceIndicatorProps) {
  const t = useTranslations();
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Determine confidence level and styling
  const getConfidenceLevel = () => {
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.6) return 'medium';
    return 'low';
  };
  
  const level = getConfidenceLevel();
  
  const getColorClasses = () => {
    switch (level) {
      case 'high':
        return {
          bg: 'bg-gradient-to-r from-green-500 to-emerald-500',
          text: 'text-green-700',
          ring: 'stroke-green-500',
        };
      case 'medium':
        return {
          bg: 'bg-gradient-to-r from-yellow-500 to-amber-500',
          text: 'text-yellow-700',
          ring: 'stroke-yellow-500',
        };
      case 'low':
        return {
          bg: 'bg-gradient-to-r from-red-500 to-rose-500',
          text: 'text-red-700',
          ring: 'stroke-red-500',
        };
    }
  };
  
  const getLabel = () => {
    const percentage = Math.round(confidence * 100);
    switch (level) {
      case 'high':
        return t('confidence.high') || `高信頼度 (${percentage}%)`;
      case 'medium':
        return t('confidence.medium') || `中信頼度 (${percentage}%)`;
      case 'low':
        return t('confidence.low') || `低信頼度 (${percentage}%)`;
    }
  };

  const getTooltipText = () => {
    const percentage = Math.round(confidence * 100);
    if (level === 'high') {
      return `この情報は信頼性が高いです (${percentage}%)`;
    } else if (level === 'medium') {
      return `この情報は信頼性が中程度です (${percentage}%)`;
    } else {
      return `この情報の信頼性は低めです (${percentage}%)`;
    }
  };
  
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return { height: 'h-1', text: 'text-xs', ring: 32 };
      case 'md':
        return { height: 'h-2', text: 'text-sm', ring: 48 };
      case 'lg':
        return { height: 'h-3', text: 'text-base', ring: 64 };
    }
  };
  
  const percentage = Math.round(confidence * 100);
  const colors = getColorClasses();
  const sizes = getSizeClasses();

  // Ring/Circle variant
  if (variant === 'ring') {
    const radius = sizes.ring / 2 - 4;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (confidence * circumference);

    return (
      <div 
        className="relative inline-flex items-center justify-center"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <svg width={sizes.ring} height={sizes.ring} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={sizes.ring / 2}
            cy={sizes.ring / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            className="text-gray-200"
          />
          {/* Progress circle */}
          <circle
            cx={sizes.ring / 2}
            cy={sizes.ring / 2}
            r={radius}
            strokeWidth="4"
            fill="none"
            className={`${colors.ring} ${animated ? 'transition-all duration-1000 ease-out' : ''}`}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        {/* Center percentage */}
        <div className={`absolute inset-0 flex items-center justify-center font-bold ${colors.text} ${sizes.text}`}>
          {percentage}%
        </div>
        {/* Tooltip */}
        {showTooltip && (
          <div className="absolute bottom-full mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg whitespace-nowrap z-10 animate-fadeIn">
            {getTooltipText()}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
              <div className="border-4 border-transparent border-t-gray-900" />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Bar variant (default)
  return (
    <div 
      className="w-full relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {showLabel && (
        <div className={`flex items-center justify-between mb-1.5 ${sizes.text}`}>
          <span className={`font-medium ${colors.text}`}>{getLabel()}</span>
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${sizes.height} relative`}>
        <div
          className={`
            ${colors.bg} ${sizes.height} 
            ${animated ? 'transition-all duration-1000 ease-out' : ''}
            relative
          `}
          style={{ width: `${percentage}%` }}
        >
          {/* Shine effect */}
          {animated && (
            <div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer"
              style={{ backgroundSize: '200% 100%' }}
            />
          )}
        </div>
      </div>
      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg whitespace-nowrap z-10 animate-fadeIn">
          {getTooltipText()}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-[-4px]">
            <div className="border-4 border-transparent border-b-gray-900" />
          </div>
        </div>
      )}
    </div>
  );
}