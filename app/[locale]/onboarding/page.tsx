'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { z } from 'zod';
import { Loader2, ChevronDown, Info, ArrowRight } from 'lucide-react';
import { PREFECTURES, EXPERIENCE_OPTIONS, FARMING_TYPES, COMMON_CROPS } from '../../../lib/prefectures';
import turfArea from '@turf/area';
import FieldMapCanvas from '@/components/fields/FieldMapCanvas';
import { toastError } from '@/lib/feedback';
import { trackUXEvent } from '@/lib/analytics';
import { useTranslations } from 'next-intl';
import type { FarmerUiMode } from '@/types/farmer-ui-mode';
import type { FieldCentroid, GeoJsonPolygon } from '@/components/fields/types';

// Validation schemas
const profileSchema = z.object({
  name: z.string().min(1, '名前を入力してください'),
  prefecture: z.string().min(1, '都道府県を選択してください'),
  experience: z.string().min(1, '経験年数を選択してください'),
  farmingType: z.string().min(1, '栽培方法を選択してください'),
  uiMode: z.string().min(1, 'ui_mode_required'),
});

const fieldSchema = z.object({
  name: z.string().min(1, '畑の名前を入力してください'),
  area: z.number().min(0.01, '面積を入力してください'),
  crop: z.string().min(1, '作物を選択してください'),
  plantingDate: z.string().optional(),
});

type ProfileData = z.infer<typeof profileSchema>;
type FieldData = z.infer<typeof fieldSchema> & {
  geometry?: GeoJsonPolygon | null;
  centroid?: FieldCentroid | null;
};
type NoticeState = {
  type: 'error' | 'success';
  message: string;
} | null;

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function getRouteLabel(path: string): string {
  const normalized = path.split('?')[0];
  const routeLabels: Record<string, string> = {
    '/calendar': 'カレンダー',
    '/projects': 'プロジェクト一覧',
    '/projects/create': 'プロジェクト作成',
    '/records': '活動記録',
    '/chat': 'AIチャット',
    '/map': 'マップ',
    '/settings': '設定',
  };

  return routeLabels[normalized] || normalized;
}

function getOnboardingReasonMessage(reason: string | null, from: string | null): string | null {
  if (reason !== 'onboarding_required') return null;
  const safeFrom = (from || '').startsWith('/') ? from : '';

  if (safeFrom && safeFrom !== '/' && safeFrom !== '/onboarding') {
    return `「${getRouteLabel(safeFrom)}」へ進む前に初期設定の完了が必要です。完了後は通常の画面に進めます。`;
  }

  return '初期設定が未完了のため、この手順を完了してからアプリをご利用ください。';
}

function geometryAreaHa(geometry: GeoJsonPolygon | null | undefined): number | null {
  if (!geometry) return null;
  try {
    const feature = {
      type: 'Feature' as const,
      geometry,
      properties: {},
    };
    const sqm = turfArea(feature as any);
    if (!Number.isFinite(sqm) || sqm <= 0) return null;
    return Number((sqm / 10000).toFixed(2));
  } catch {
    return null;
  }
}

export default function OnboardingPage() {
  const { data: session, status, update } = useSession();
  const params = useParams<{ locale: string }>();
  const searchParams = useSearchParams();
  const locale = (params?.locale as string) || 'ja';
  const router = useRouter();
  const tonboarding = useTranslations('auth.onboarding');
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldEntryMode, setFieldEntryMode] = useState<'quick' | 'detailed'>('quick');
  const onboardingReasonMessage = getOnboardingReasonMessage(
    searchParams.get('reason'),
    searchParams.get('from')
  );

  const hasSeenLoading = useRef(false);
  const hasPrefilledName = useRef(false);
  const hasCheckedExistingProfile = useRef(false);
  const onboardingComplete = Boolean(
    (session?.user as { onboardingComplete?: boolean } | undefined)?.onboardingComplete
  );

  if (status === 'loading') {
    hasSeenLoading.current = true;
  }

  // Form data
  const [profileData, setProfileData] = useState<Partial<ProfileData>>({
    prefecture: '15', // Default to Niigata
    farmingType: 'conventional',
    experience: '1_3', // Default to reasonable middle
  });
  const [fieldData, setFieldData] = useState<Partial<FieldData>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<NoticeState>(null);

  // Pre-fill name from Google session
  useEffect(() => {
    if (session?.user?.name && !hasPrefilledName.current) {
      setProfileData(prev => ({ ...prev, name: session.user?.name || '' }));
      hasPrefilledName.current = true;
    }
  }, [session]);

  // Redirect if not authenticated
  useEffect(() => {
    if (hasSeenLoading.current && status === 'unauthenticated') {
      router.replace(`/${locale}/login`);
    }
  }, [status, router, locale]);

  // If onboarding is already complete, keep user out of onboarding flow.
  useEffect(() => {
    if (hasSeenLoading.current && status === 'authenticated' && onboardingComplete) {
      router.replace(`/${locale}`);
    }
  }, [status, onboardingComplete, router, locale]);

  // Resume onboarding at field step if profile already exists.
  useEffect(() => {
    if (status !== 'authenticated' || onboardingComplete || step !== 1 || hasCheckedExistingProfile.current) {
      return;
    }

    hasCheckedExistingProfile.current = true;

    const checkProfile = async () => {
      try {
        const response = await fetch('/api/v1/profile', { cache: 'no-store' });
        if (!response.ok) {
          return;
        }
        const payload = await response.json();
        const profile = payload?.profile;
        if (!profile) {
          return;
        }

        setProfileData((prev) => ({
          ...prev,
          name: profile.displayName || prev.name || session?.user?.name || '',
        }));
        setStep(3);
      } catch {
        // Silent fallback: stay on step 1 if profile lookup fails.
      }
    };

    void checkProfile();
  }, [status, onboardingComplete, step, session?.user?.name]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center gap-3 text-gray-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>読み込み中...</span>
        </div>
      </div>
    );
  }

  if (hasSeenLoading.current && status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center gap-3 text-gray-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>ログインページへ移動中...</span>
        </div>
      </div>
    );
  }

  if (hasSeenLoading.current && status === 'authenticated' && onboardingComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center gap-3 text-gray-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>ダッシュボードへ移動中...</span>
        </div>
      </div>
    );
  }

  const handleProfileNext = async () => {
    setNotice(null);
    try {
      profileSchema.parse(profileData);
      setErrors({});
      setIsSubmitting(true);

      const selectedPrefecture = PREFECTURES.find(p => p.code === profileData.prefecture);
      const response = await fetch('/api/v1/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: profileData.name,
          region: selectedPrefecture?.name || '新潟県',
          experienceLevel: profileData.experience,
          farmingType: profileData.farmingType,
          uiMode: profileData.uiMode,
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || 'プロフィールの保存に失敗しました');
      }

      // Trigger session update (best-effort) so middleware gets the latest auth state.
      try {
        await update();
      } catch (error) {
        console.warn('Session update failed after profile save:', error);
      }
      void trackUXEvent('onboarding_profile_saved', {
        experience: profileData.experience || 'unknown',
        farmingType: profileData.farmingType || 'unknown',
        uiMode: profileData.uiMode || 'unknown',
      });
      setStep(3);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.issues.forEach((issue) => {
          if (issue.path[0]) {
            const key = issue.path[0].toString();
            if (key === 'uiMode') {
              newErrors[key] = tonboarding('profile.farmer_mode_required');
              return;
            }
            newErrors[key] = issue.message;
          }
        });
        setErrors(newErrors);
        void trackUXEvent('onboarding_profile_save_failed', {
          reason: 'validation',
          step: 2,
          fields: Object.keys(newErrors).join(',') || 'unknown',
        });
      } else {
        const message = getErrorMessage(err, 'プロフィールの保存に失敗しました。時間をおいて再試行してください。');
        void trackUXEvent('onboarding_profile_save_failed', {
          reason: 'request',
          step: 2,
        });
        setNotice({
          type: 'error',
          message,
        });
        toastError(message, {
          label: '再試行',
          onClick: () => {
            void trackUXEvent('onboarding_profile_retry_clicked', {
              surface: 'toast',
            });
            void handleProfileNext();
          },
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFieldSubmit = async () => {
    setNotice(null);
    try {
      fieldSchema.parse(fieldData);
      if (!fieldData.centroid && !fieldData.geometry) {
        throw new Error('位置ピンまたは圃場境界を設定してください');
      }
      setErrors({});
      setIsSubmitting(true);

      const selectedCrop = COMMON_CROPS.find(c => c.value === fieldData.crop);

      const response = await fetch('/api/v1/fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fieldData.name,
          areaSqm: (fieldData.area || 0) * 10000, // Convert Ha to SqM for storage
          crop: selectedCrop?.label || fieldData.crop,
          planting_date: fieldData.plantingDate || null,
          geometry: fieldData.geometry || null,
          centroid: fieldData.centroid || null,
          geoStatus: fieldData.geometry ? 'verified' : 'approximate',
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || '圃場の登録に失敗しました');
      }

      // Refresh token/session (best-effort) so middleware receives onboardingComplete=true.
      try {
        await update();
      } catch (error) {
        console.warn('Session update failed after field save:', error);
      }
      void trackUXEvent('onboarding_field_saved', {
        mode: fieldEntryMode,
        hasPolygon: Boolean(fieldData.geometry && fieldData.geometry.coordinates[0].length > 3),
        hasLocation: Boolean(fieldData.centroid),
      });
      router.push(`/${locale}/projects/create`);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.issues.forEach((issue) => {
          if (issue.path[0]) {
            newErrors[issue.path[0].toString()] = issue.message;
          }
        });
        setErrors(newErrors);
        void trackUXEvent('onboarding_field_save_failed', {
          reason: 'validation',
          step: 3,
          fields: Object.keys(newErrors).join(',') || 'unknown',
        });
      } else {
        console.error('Field creation error:', err);
        const message = getErrorMessage(err, '圃場の登録に失敗しました。入力内容を確認して再試行してください。');
        void trackUXEvent('onboarding_field_save_failed', {
          reason: 'request',
          step: 3,
        });
        setNotice({
          type: 'error',
          message,
        });
        toastError(message, {
          label: '再試行',
          onClick: () => {
            void trackUXEvent('onboarding_field_retry_clicked', {
              surface: 'toast',
            });
            void handleFieldSubmit();
          },
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const setTodayDate = () => {
    const today = new Date().toISOString().split('T')[0];
    setFieldData({ ...fieldData, plantingDate: today });
  };

  const handleModeSelect = (uiMode: FarmerUiMode) => {
    setProfileData((prev) => ({ ...prev, uiMode }));
    setErrors((prev) => {
      if (!prev.uiMode) return prev;
      const next = { ...prev };
      delete next.uiMode;
      return next;
    });
    void trackUXEvent('onboarding_farmer_mode_selected', {
      uiMode,
      experience: profileData.experience || 'unknown',
    });
  };

  // Step 1: Welcome
  if (step === 1) {
    return (
      <OnboardingLayout step={1} totalSteps={3} reasonMessage={onboardingReasonMessage}>
        <div className="text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto">
            <span className="text-3xl">🌾</span>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {session?.user?.name ? `${session.user.name}さん、` : ''}ようこそ
            </h1>
            <p className="text-gray-600">
              農作業の計画と記録を、会話でシンプルに
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 mt-8 text-left">
            <FeatureRow icon="📅" text="天気を見ながら最適なスケジュールを自動作成" />
            <FeatureRow icon="📸" text="写真を送るだけで病害虫を診断" />
            <FeatureRow icon="📝" text="作業記録を話しかけるだけで保存" />
          </div>

          <button
            onClick={() => setStep(2)}
            className="w-full mt-6 px-6 py-4 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 transition-colors font-medium flex items-center justify-center gap-2"
          >
            セットアップを始める
            <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-xs text-gray-400">約1分で完了します</p>
        </div>
      </OnboardingLayout>
    );
  }

  // Step 2: Profile
  if (step === 2) {
    return (
      <OnboardingLayout step={2} totalSteps={3} reasonMessage={onboardingReasonMessage}>
        <div className="space-y-6">
          <div className="text-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">基本情報</h2>
            <p className="text-sm text-gray-500">より正確なアドバイスのために教えてください</p>
          </div>

          {notice?.type === 'error' && (
            <InlineRecoveryNotice
              message={notice.message}
              retryLabel="再試行"
              disabled={isSubmitting}
              onRetry={() => {
                void trackUXEvent('onboarding_profile_retry_clicked', {
                  surface: 'inline',
                });
                void handleProfileNext();
              }}
            />
          )}

          <div className="space-y-4">
            {/* Name - pre-filled from Google */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">お名前</label>
              <input
                type="text"
                value={profileData.name || ''}
                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                placeholder="田中 太郎"
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${errors.name ? 'border-red-500' : 'border-gray-200'
                  }`}
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>

            {/* Prefecture */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">お住まいの地域</label>
              <SelectField
                value={profileData.prefecture || ''}
                onChange={(value) => setProfileData({ ...profileData, prefecture: value })}
                options={PREFECTURES.map(p => ({ value: p.code, label: p.name }))}
                placeholder="都道府県を選択"
                error={errors.prefecture}
              />
            </div>

            {/* Experience - reframed positively */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                農業の経験
                <span className="text-gray-400 font-normal ml-2">初心者でも大歓迎</span>
              </label>
              <SelectField
                value={profileData.experience || ''}
                onChange={(value) => setProfileData({ ...profileData, experience: value })}
                options={EXPERIENCE_OPTIONS}
                placeholder="選択してください"
                error={errors.experience}
              />
            </div>

            {/* Farming Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">栽培方法</label>
              <SelectField
                value={profileData.farmingType || ''}
                onChange={(value) => setProfileData({ ...profileData, farmingType: value })}
                options={FARMING_TYPES}
                placeholder="選択してください"
                error={errors.farmingType}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {tonboarding('profile.farmer_mode_label')}
              </label>
              <p className="mb-2 text-xs text-gray-500">{tonboarding('profile.farmer_mode_help')}</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  data-testid="onboarding-farmer-mode-new"
                  onClick={() => {
                    handleModeSelect('new_farmer');
                  }}
                  className={`rounded-xl border px-3 py-3 text-left transition ${
                    profileData.uiMode === 'new_farmer'
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="text-sm font-semibold">{tonboarding('profile.farmer_mode_new_title')}</p>
                  <p className="mt-1 text-xs text-gray-600">{tonboarding('profile.farmer_mode_new_desc')}</p>
                </button>
                <button
                  type="button"
                  data-testid="onboarding-farmer-mode-veteran"
                  onClick={() => {
                    handleModeSelect('veteran_farmer');
                  }}
                  className={`rounded-xl border px-3 py-3 text-left transition ${
                    profileData.uiMode === 'veteran_farmer'
                      ? 'border-sky-300 bg-sky-50 text-sky-900'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="text-sm font-semibold">{tonboarding('profile.farmer_mode_veteran_title')}</p>
                  <p className="mt-1 text-xs text-gray-600">{tonboarding('profile.farmer_mode_veteran_desc')}</p>
                </button>
              </div>
              {errors.uiMode && <p className="mt-1 text-sm text-red-600">{errors.uiMode}</p>}
            </div>
          </div>

          <div className="pt-4 space-y-3">
            <button
              onClick={handleProfileNext}
              disabled={isSubmitting || !profileData.uiMode}
              className="w-full px-6 py-4 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  次へ
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
            <button
              onClick={() => setStep(1)}
              disabled={isSubmitting}
              className="w-full text-gray-500 hover:text-gray-700 text-sm"
            >
              戻る
            </button>
          </div>

          <p className="text-xs text-gray-400 text-center">
            <Info className="w-3 h-3 inline mr-1" />
            後から設定で変更できます
          </p>
        </div>
      </OnboardingLayout>
    );
  }

  // Step 3: Field Creation
  if (step === 3) {
    return (
      <OnboardingLayout step={3} totalSteps={3} reasonMessage={onboardingReasonMessage}>
        <div className="space-y-6">
          <div className="text-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">最初の畑を登録</h2>
            <p className="text-sm text-gray-500">おすすめ設定です（後から追加もできます）</p>
          </div>

          {notice?.type === 'error' && (
            <InlineRecoveryNotice
              message={notice.message}
              retryLabel="再試行"
              disabled={isSubmitting}
              onRetry={() => {
                void trackUXEvent('onboarding_field_retry_clicked', {
                  surface: 'inline',
                });
                void handleFieldSubmit();
              }}
            />
          )}

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
            <p className="mb-2 text-sm font-medium text-gray-800">入力モード</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFieldEntryMode('quick')}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  fieldEntryMode === 'quick'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                かんたん登録
              </button>
              <button
                type="button"
                onClick={() => setFieldEntryMode('detailed')}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  fieldEntryMode === 'detailed'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                地図も登録
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-600">
              {fieldEntryMode === 'quick'
                ? '地図をタップして位置ピンを設定します。スケジュール開始に必須です。'
                : '地図で境界をタップして面積を自動計算できます。'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              圃場の位置
              <span className="text-gray-400 font-normal ml-2">
                {fieldEntryMode === 'quick'
                  ? '地図をタップしてピンを落としてください'
                  : '地図をタップして境界点を追加してください'}
              </span>
            </label>

            <FieldMapCanvas
              fields={[]}
              selectedFieldId={null}
              draftGeometry={fieldData.geometry || null}
              draftCentroid={fieldData.centroid || null}
              drawMode={fieldEntryMode === 'quick' ? 'centroid' : 'polygon'}
              riskByFieldId={{}}
              onSelectField={() => { }}
              onDraftGeometryChange={(geometry) => {
                const areaHa = geometryAreaHa(geometry);
                setFieldData((prev) => ({
                  ...prev,
                  geometry,
                  area: areaHa ?? prev.area,
                }));
              }}
              onDraftCentroidChange={(centroid) => {
                setFieldData((prev) => ({
                  ...prev,
                  centroid,
                }));
              }}
            />
          </div>

          {/* Area (Read-only / Manual Override) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              面積
              <span className="text-gray-400 font-normal ml-2">ヘクタール（ha）</span>
            </label>
            <input
              type="number"
              step="0.01"
              value={fieldData.area?.toString() || ''}
              onChange={(e) => setFieldData({ ...fieldData, area: parseFloat(e.target.value) || 0 })}
              placeholder={fieldEntryMode === 'detailed' ? '地図から自動計算 (手動上書き可)' : '例: 0.3'}
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${errors.area ? 'border-red-500' : 'border-gray-200'
                }`}
            />
            <p className="mt-1 text-xs text-gray-400">
              {fieldEntryMode === 'detailed'
                ? '地図で囲むと自動入力されます（手動修正も可）'
                : 'ピン登録時は概算面積を入力してください。後で境界編集で精度を上げられます。'}
            </p>
            {errors.area && <p className="mt-1 text-sm text-red-600">{errors.area}</p>}
          </div>

          {/* Field Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">畑の名前</label>
            <input
              type="text"
              value={fieldData.name || ''}
              onChange={(e) => setFieldData({ ...fieldData, name: e.target.value })}
              placeholder="例：家の前の畑、第1圃場"
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${errors.name ? 'border-red-500' : 'border-gray-200'
                }`}
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
          </div>

          {/* Crop */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">今育てている作物</label>
            <SelectField
              value={fieldData.crop || ''}
              onChange={(value) => setFieldData({ ...fieldData, crop: value })}
              options={COMMON_CROPS}
              placeholder="選択してください"
              error={errors.crop}
            />
          </div>

          {/* Planting Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              定植日・播種日
              <span className="text-gray-400 font-normal ml-2">任意</span>
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={fieldData.plantingDate || ''}
                onChange={(e) => setFieldData({ ...fieldData, plantingDate: e.target.value })}
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={setTodayDate}
                className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors text-sm font-medium"
              >
                今日
              </button>
            </div>
          </div>

        </div>

        <div className="pt-4 space-y-3">
          {/* ... buttons ... */}
          <button
            onClick={handleFieldSubmit}
            disabled={isSubmitting || (!fieldData.centroid && !fieldData.geometry)}
            className="w-full px-6 py-4 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                作成中...
              </>
            ) : (
              <>
                登録して続ける
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="flex justify-between items-center">
            <button
              onClick={() => setStep(2)}
              disabled={isSubmitting}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              戻る
            </button>
            <span className="text-xs text-gray-400">位置ピンは必須です</span>
          </div>
        </div>
      </OnboardingLayout>
    );
  }

  // Onboarding complete — user should have been redirected already.
  // Fallback: redirect to project creation.
  router.push(`/${locale}/projects/create`);
  return null;
}

// Layout
function OnboardingLayout({
  step,
  totalSteps,
  reasonMessage,
  children,
}: {
  step: number;
  totalSteps: number;
  reasonMessage?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Progress bar - minimal */}
      <div className="h-1 bg-gray-100">
        <div
          className="h-full bg-emerald-500 transition-all duration-300"
          style={{ width: `${(step / totalSteps) * 100}%` }}
        />
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {reasonMessage && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <p className="font-semibold">先に初期設定が必要です</p>
              <p className="mt-1">{reasonMessage}</p>
              <p className="mt-1 text-xs text-amber-700">必須フロー: 基本情報 {'>'} 圃場登録 {'>'} 最初のプロジェクト作成</p>
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

// Feature row for welcome
function FeatureRow({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
      <span className="text-xl">{icon}</span>
      <span className="text-sm text-gray-700">{text}</span>
    </div>
  );
}

function InlineRecoveryNotice(props: {
  message: string;
  retryLabel: string;
  disabled?: boolean;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
      <p className="text-sm text-red-700">{props.message}</p>
      <button
        type="button"
        onClick={props.onRetry}
        disabled={props.disabled}
        className="mt-2 inline-flex items-center rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {props.retryLabel}
      </button>
    </div>
  );
}

// Select field helper
function SelectField({
  value,
  onChange,
  options,
  placeholder,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  error?: string;
}) {
  return (
    <div>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent appearance-none bg-white ${error ? 'border-red-500' : 'border-gray-200'
            }`}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
