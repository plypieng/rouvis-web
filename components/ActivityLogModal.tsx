'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { X, Save, MapPin, Calendar, Mic, MicOff } from 'lucide-react';
import { toastError, toastSuccess } from '@/lib/feedback';
import { trackUXEvent } from '@/lib/analytics';

interface Field {
  id: string;
  name: string;
  crop?: string;
  area?: number;
}

interface ActivityLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (activity: {
    fieldId?: string;
    type: string;
    quantity?: number;
    unit?: string;
    note?: string;
    performedAt?: string;
  }) => Promise<{ queued?: boolean } | void>;
  initialFieldId?: string;
  autoStartVoice?: boolean;
  locale?: string;
}

type VoiceState = 'idle' | 'listening' | 'error';

interface SpeechRecognitionResultLike {
  0: { transcript: string };
  isFinal: boolean;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: SpeechRecognitionResultLike[];
}

interface SpeechRecognitionErrorLike {
  error: string;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}

const ACTIVITY_TYPES = [
  { value: 'watering', label: '水やり', icon: '💧', units: ['L', 'm³'] },
  { value: 'fertilizing', label: '肥料投入', icon: '🌱', units: ['kg', 'g', 'L'] },
  { value: 'harvesting', label: '収穫', icon: '🚜', units: ['kg', '個', '束'] },
  { value: 'planting', label: '植え付け', icon: '🌾', units: ['個', 'm²', '穴'] },
  { value: 'weeding', label: '除草', icon: '🌿', units: ['m²', '時間'] },
  { value: 'pesticide_application', label: '農薬散布', icon: '🧪', units: ['L', 'kg', 'm²'] },
  { value: 'pruning', label: '剪定', icon: '✂️', units: ['本', '時間'] },
  { value: 'other', label: 'その他', icon: '⚡', units: [] },
];

export function ActivityLogModal({
  isOpen,
  onClose,
  onSave,
  initialFieldId,
  autoStartVoice = false,
  locale = 'ja',
}: ActivityLogModalProps) {
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceErrorMessage, setVoiceErrorMessage] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const autoVoiceStartedRef = useRef(false);

  const [formData, setFormData] = useState({
    fieldId: initialFieldId || '',
    type: 'watering',
    quantity: '',
    unit: '',
    note: '',
    performedAt: new Date().toISOString().slice(0, 16), // YYYY-MM-DDTHH:MM format
  });

  const voiceCopy = useMemo(() => {
    if (locale === 'en') {
      return {
        start: 'Start voice input',
        stop: 'Stop voice input',
        listening: 'Listening... speak your activity.',
        unsupported: 'Voice input is not supported in this browser. Please type manually.',
        parseHint: 'Voice transcript was added to memo. Detected values are prefilled when possible.',
        retry: 'Retry',
      };
    }
    return {
      start: '音声入力を開始',
      stop: '音声入力を停止',
      listening: '音声を認識中です。作業内容を話してください。',
      unsupported: 'このブラウザでは音声入力が使えません。手入力で記録してください。',
      parseHint: '音声の内容をメモに追加しました。判定できた項目は自動入力しています。',
      retry: '再試行',
    };
  }, [locale]);

  const voiceSupported = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchFields();
      setErrorMessage(null);
      setVoiceState('idle');
      setVoiceTranscript('');
      setVoiceErrorMessage(null);
      autoVoiceStartedRef.current = false;
      setFormData(prev => ({
        ...prev,
        fieldId: initialFieldId || '',
        performedAt: new Date().toISOString().slice(0, 16),
      }));
    }
  }, [isOpen, initialFieldId]);

  const fetchFields = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/fields');
      if (response.ok) {
        const data = await response.json();
        setFields(data.fields || []);
      }
    } catch (error) {
      console.error('Failed to fetch fields:', error);
    } finally {
      setLoading(false);
    }
  };

  const submitActivity = async () => {
    if (!formData.type) {
      const message = '活動タイプを選択してください';
      setErrorMessage(message);
      toastError(message);
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    try {
      const saveResult = await onSave({
        fieldId: formData.fieldId || undefined,
        type: formData.type,
        quantity: formData.quantity ? parseFloat(formData.quantity) : undefined,
        unit: formData.unit || undefined,
        note: formData.note || undefined,
        performedAt: formData.performedAt,
      });

      // Reset form
      setFormData({
        fieldId: '',
        type: 'watering',
        quantity: '',
        unit: '',
        note: '',
        performedAt: new Date().toISOString().slice(0, 16),
      });

      onClose();
      if (saveResult && saveResult.queued) {
        toastSuccess(locale === 'en'
          ? 'Saved offline. It will sync automatically when you are back online.'
          : 'オフラインで保存しました。オンライン復帰時に自動同期します。');
      } else {
        toastSuccess('活動を保存しました。');
      }
      if (voiceTranscript) {
        void trackUXEvent('records_voice_input_submit_from_voice', {
          hasTranscript: true,
          hasField: Boolean(formData.fieldId),
          type: formData.type,
        });
      }
    } catch (error) {
      console.error('Failed to save activity:', error);
      const message = error instanceof Error ? error.message : '活動の保存に失敗しました';
      setErrorMessage(message);
      toastError(message, {
        label: '再試行',
        onClick: () => {
          void submitActivity();
        },
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitActivity();
  };

  const selectedActivityType = ACTIVITY_TYPES.find(type => type.value === formData.type);

  const applyVoiceTranscript = useCallback((rawTranscript: string) => {
    const transcript = rawTranscript.trim();
    if (!transcript) return;

    let nextType = formData.type;
    if (/水|水やり|灌水|watering/i.test(transcript)) nextType = 'watering';
    else if (/肥料|施肥|fertiliz/i.test(transcript)) nextType = 'fertilizing';
    else if (/収穫|harvest/i.test(transcript)) nextType = 'harvesting';
    else if (/植え|定植|plant/i.test(transcript)) nextType = 'planting';
    else if (/除草|草取り|weed/i.test(transcript)) nextType = 'weeding';
    else if (/農薬|防除|spray|pesticide/i.test(transcript)) nextType = 'pesticide_application';
    else if (/剪定|prune/i.test(transcript)) nextType = 'pruning';

    const quantityMatch = transcript.match(/(\d+(?:\.\d+)?)\s*(l|L|kg|g|m2|m²|m3|m³|時間|本|個|束)/);
    const quantity = quantityMatch?.[1] || '';
    const unit = quantityMatch?.[2] || '';
    const selectedField = fields.find((field) => transcript.includes(field.name));
    const parsedUnit = unit === 'm2' ? 'm²' : unit === 'm3' ? 'm³' : unit;

    setFormData((prev) => {
      const supportedUnits = ACTIVITY_TYPES.find((item) => item.value === nextType)?.units || [];
      const resolvedUnit = parsedUnit && supportedUnits.includes(parsedUnit)
        ? parsedUnit
        : prev.unit || supportedUnits[0] || '';
      return {
        ...prev,
        type: nextType,
        quantity: quantity || prev.quantity,
        unit: resolvedUnit,
        fieldId: selectedField?.id || prev.fieldId,
        note: prev.note ? `${prev.note}\n${transcript}` : transcript,
      };
    });

    setVoiceTranscript(transcript);
    void trackUXEvent('records_voice_input_applied', {
      hasQuantity: Boolean(quantity),
      hasField: Boolean(selectedField?.id),
      type: nextType,
    });
  }, [fields, formData.type]);

  const startVoiceCapture = useCallback(async () => {
    if (!voiceSupported) {
      setVoiceErrorMessage(voiceCopy.unsupported);
      setVoiceState('error');
      return;
    }

    if (voiceState === 'listening') return;

    try {
      const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!Ctor) {
        setVoiceErrorMessage(voiceCopy.unsupported);
        setVoiceState('error');
        return;
      }

      const recognition = new Ctor();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = locale === 'en' ? 'en-US' : 'ja-JP';

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          if (!event.results[i]?.isFinal) continue;
          transcript += event.results[i]?.[0]?.transcript || '';
        }
        if (transcript) {
          applyVoiceTranscript(transcript);
          void trackUXEvent('records_voice_input_result', {
            transcriptLength: transcript.length,
          });
        }
      };

      recognition.onerror = (event) => {
        setVoiceState('error');
        const message = event.error === 'not-allowed'
          ? (locale === 'en' ? 'Microphone permission is required.' : 'マイクの利用許可が必要です。')
          : (locale === 'en' ? 'Voice input failed. Please retry or type manually.' : '音声入力に失敗しました。再試行するか手入力してください。');
        setVoiceErrorMessage(message);
        void trackUXEvent('records_voice_input_failed', {
          reason: event.error || 'unknown',
        });
      };

      recognition.onend = () => {
        setVoiceState((prev) => (prev === 'error' ? 'error' : 'idle'));
      };

      recognitionRef.current = recognition;
      setVoiceErrorMessage(null);
      setVoiceState('listening');
      recognition.start();
      void trackUXEvent('records_voice_input_started', {
        locale,
      });
    } catch (error) {
      console.error('Voice input failed:', error);
      setVoiceState('error');
      setVoiceErrorMessage(locale === 'en'
        ? 'Voice input could not start. Please retry.'
        : '音声入力を開始できませんでした。再試行してください。');
    }
  }, [applyVoiceTranscript, locale, voiceCopy.unsupported, voiceState, voiceSupported]);

  const stopVoiceCapture = useCallback(() => {
    recognitionRef.current?.stop();
    setVoiceState('idle');
  }, []);

  useEffect(() => {
    if (!isOpen) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      return;
    }

    if (!autoStartVoice || autoVoiceStartedRef.current) return;
    if (!voiceSupported) return;
    autoVoiceStartedRef.current = true;
    setTimeout(() => {
      void startVoiceCapture();
    }, 80);
  }, [autoStartVoice, isOpen, startVoiceCapture, voiceSupported]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 safe-top safe-bottom p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto mobile-scroll">
        {/* Header - Mobile optimized */}
        <div className="flex items-center justify-between mobile-spacing border-b">
          <h2 className="text-mobile-lg font-semibold text-gray-900">活動を記録</h2>
          <button
            onClick={onClose}
            className="touch-target hover:bg-gray-100 rounded-full transition-colors mobile-tap"
            aria-label="閉じる"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form - Mobile optimized */}
        <form onSubmit={handleSubmit} className="mobile-spacing space-y-4">
          {errorMessage && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <div className="flex items-center justify-between gap-3">
                <span>{errorMessage}</span>
                <button
                  type="button"
                  onClick={() => { void submitActivity(); }}
                  className="rounded-md border border-current px-2 py-1 text-xs font-semibold hover:bg-white/40"
                  disabled={saving}
                >
                  再試行
                </button>
              </div>
            </div>
          )}

          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-emerald-800">
                {voiceState === 'listening' ? voiceCopy.listening : voiceCopy.start}
              </p>
              <button
                type="button"
                onClick={() => {
                  if (voiceState === 'listening') {
                    stopVoiceCapture();
                    return;
                  }
                  void startVoiceCapture();
                }}
                className={`inline-flex min-h-[40px] items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                  voiceState === 'listening'
                    ? 'border-red-300 bg-white text-red-700 hover:bg-red-50'
                    : 'border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                {voiceState === 'listening' ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                {voiceState === 'listening' ? voiceCopy.stop : voiceCopy.start}
              </button>
            </div>

            {voiceErrorMessage ? (
              <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-2 py-2 text-xs text-red-700">
                <div className="flex items-center justify-between gap-2">
                  <span>{voiceErrorMessage}</span>
                  <button
                    type="button"
                    onClick={() => { void startVoiceCapture(); }}
                    className="rounded border border-current px-2 py-1 font-semibold hover:bg-white/40"
                  >
                    {voiceCopy.retry}
                  </button>
                </div>
              </div>
            ) : null}

            {voiceTranscript ? (
              <p className="mt-2 text-xs text-emerald-700">
                {voiceCopy.parseHint}
              </p>
            ) : null}
          </div>

          {/* Field Selection - Mobile optimized */}
          <div>
            <label className="block text-mobile-sm font-medium text-gray-700 mb-2">
              圃場 <span className="text-gray-500">(任意)</span>
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 flex-shrink-0" />
              <select
                value={formData.fieldId}
                onChange={(e) => setFormData(prev => ({ ...prev, fieldId: e.target.value }))}
                className="mobile-input pl-12 pr-4"
                disabled={loading}
                aria-label="圃場を選択"
              >
                <option value="">圃場を選択...</option>
                {fields.map((field) => (
                  <option key={field.id} value={field.id}>
                    {field.name} {field.crop && `(${field.crop})`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Activity Type - Mobile optimized grid */}
          <div>
            <label className="block text-mobile-sm font-medium text-gray-700 mb-2">
              活動タイプ
            </label>
            <div className="mobile-grid-2 gap-2">
              {ACTIVITY_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    type: type.value,
                    unit: type.units.length > 0 ? type.units[0] : '',
                  }))}
                  className={`mobile-btn-secondary text-left mobile-tap ${
                    formData.type === type.value
                      ? 'bg-green-50 border-green-500 text-green-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  aria-pressed={formData.type === type.value}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{type.icon}</span>
                    <span className="text-mobile-sm font-medium">{type.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Quantity and Unit - Mobile responsive */}
          {selectedActivityType && selectedActivityType.units.length > 0 && (
            <div className="mobile-grid-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-mobile-sm font-medium text-gray-700 mb-2">
                  数量 <span className="text-gray-500">(任意)</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.quantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                  placeholder="例: 20"
                  className="mobile-input"
                  inputMode="decimal"
                />
              </div>
              <div>
                <label className="block text-mobile-sm font-medium text-gray-700 mb-2">
                  単位
                </label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                  className="mobile-input"
                >
                  {selectedActivityType.units.map((unit) => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Date and Time - Mobile optimized */}
          <div>
            <label className="block text-mobile-sm font-medium text-gray-700 mb-2">
              実施日時
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 flex-shrink-0" />
              <input
                type="datetime-local"
                value={formData.performedAt}
                onChange={(e) => setFormData(prev => ({ ...prev, performedAt: e.target.value }))}
                className="mobile-input pl-12 pr-4"
              />
            </div>
          </div>

          {/* Notes - Mobile optimized */}
          <div>
            <label className="block text-mobile-sm font-medium text-gray-700 mb-2">
              メモ <span className="text-gray-500">(任意)</span>
            </label>
            <textarea
              value={formData.note}
              onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
              placeholder="活動に関する詳細なメモ..."
              rows={3}
              className="mobile-input resize-none"
              autoCapitalize="sentences"
              autoCorrect="on"
            />
          </div>

          {/* Actions - Mobile optimized */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 mobile-btn-secondary"
              disabled={saving}
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 mobile-btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span className="text-mobile-sm">保存中...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span className="text-mobile-sm">保存</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
