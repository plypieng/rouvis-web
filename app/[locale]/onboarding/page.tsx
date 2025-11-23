'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { z } from 'zod';

// Validation schemas
const profileSchema = z.object({
  name: z.string().min(1, '名前を入力してください'),
  region: z.string().min(1, '地域を入力してください'),
  farmSize: z.number().min(0.01, '農地面積を入力してください'),
});

const fieldSchema = z.object({
  name: z.string().min(1, '圃場名を入力してください'),
  area: z.number().min(0.01, '面積を入力してください'),
  crop: z.string().min(1, '作物を入力してください'),
  plantingDate: z.string().optional(),
});

type ProfileData = z.infer<typeof profileSchema>;
type FieldData = z.infer<typeof fieldSchema>;

export default function OnboardingPage() {
  const t = useTranslations('auth.onboarding');
  const { data: session, status } = useSession();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form data
  const [profileData, setProfileData] = useState<Partial<ProfileData>>({
    region: '新潟県', // Default to Niigata
  });
  const [fieldData, setFieldData] = useState<Partial<FieldData>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Redirect if not authenticated (moved to effect to avoid updating Router during render)
  useEffect(() => {
    console.debug('[Onboarding] session status:', status);
    if (status === 'unauthenticated') {
      console.debug('[Onboarding] redirect unauthenticated -> /login');
      router.replace('/login');
    }
  }, [status, router]);

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Redirecting...</div>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  const handleProfileNext = () => {
    try {
      profileSchema.parse(profileData);
      setErrors({});
      setStep(3); // Skip welcome (step 2), go to field creation (step 3)
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.issues.forEach((error: any) => {
          if (error.path[0]) {
            newErrors[error.path[0].toString()] = error.message;
          }
        });
        setErrors(newErrors);
      }
    }
  };

  const handleFieldSubmit = async () => {
    try {
      fieldSchema.parse(fieldData);
      setErrors({});
      setIsSubmitting(true);

      // Create field via API
      const response = await fetch('/api/v1/fields', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: fieldData.name,
          area: fieldData.area,
          crop: fieldData.crop,
          planting_date: fieldData.plantingDate || null,
          geojson: null, // Can be added later
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create field');
      }

      // Redirect to dashboard/calendar
      console.debug('[Onboarding] field created, navigating -> /calendar');
      router.push('/calendar');
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.issues.forEach((error: any) => {
          if (error.path[0]) {
            newErrors[error.path[0].toString()] = error.message;
          }
        });
        setErrors(newErrors);
      } else {
        console.error('Field creation error:', err);
        alert('圃場の作成に失敗しました。もう一度お試しください。');
      }
      setIsSubmitting(false);
    }
  };

  // Welcome Step
  if (step === 1) {
    return (
      <OnboardingLayout step={1} totalSteps={3}>
        <div className="text-center space-y-6">
          <div className="text-6xl mb-4">🌾</div>
          <h1 className="text-3xl font-bold text-gray-900">{t('welcome.title')}</h1>
          <p className="text-lg text-gray-600">{t('welcome.subtitle')}</p>
          <p className="text-gray-600">{t('welcome.description')}</p>

          {/* Benefits */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <BenefitCard icon="💬" title={t('welcome.benefits.chat')} />
            <BenefitCard icon="🌦️" title={t('welcome.benefits.weather')} />
            <BenefitCard icon="📚" title={t('welcome.benefits.knowledge')} />
          </div>

          <button
            onClick={() => setStep(2)}
            className="mt-8 px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            {t('welcome.nextButton')}
          </button>
        </div>
      </OnboardingLayout>
    );
  }

  // Profile Step (currently skipped in flow, but code kept for future)
  if (step === 2) {
    return (
      <OnboardingLayout step={2} totalSteps={3}>
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">{t('profile.title')}</h2>
          <p className="text-gray-600">{t('profile.subtitle')}</p>

          <div className="space-y-4">
            <FormField
              label={t('profile.nameLabel')}
              placeholder={t('profile.namePlaceholder')}
              value={profileData.name || ''}
              onChange={(value) => setProfileData({ ...profileData, name: value })}
              error={errors.name}
            />

            <FormField
              label={t('profile.regionLabel')}
              placeholder={t('profile.regionPlaceholder')}
              value={profileData.region || ''}
              onChange={(value) => setProfileData({ ...profileData, region: value })}
              error={errors.region}
            />

            <FormField
              label={t('profile.farmSizeLabel')}
              placeholder={t('profile.farmSizePlaceholder')}
              type="number"
              step="0.1"
              value={profileData.farmSize?.toString() || ''}
              onChange={(value) => setProfileData({ ...profileData, farmSize: parseFloat(value) || 0 })}
              error={errors.farmSize}
            />
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {t('profile.backButton')}
            </button>
            <button
              onClick={handleProfileNext}
              className="flex-1 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              {t('profile.nextButton')}
            </button>
          </div>
        </div>
      </OnboardingLayout>
    );
  }

  // Field Creation Step
  return (
    <OnboardingLayout step={3} totalSteps={3}>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">{t('field.title')}</h2>
        <p className="text-gray-600">{t('field.subtitle')}</p>

        <div className="space-y-4">
          <FormField
            label={t('field.nameLabel')}
            placeholder={t('field.namePlaceholder')}
            value={fieldData.name || ''}
            onChange={(value) => setFieldData({ ...fieldData, name: value })}
            error={errors.name}
          />

          <FormField
            label={t('field.areaLabel')}
            placeholder={t('field.areaPlaceholder')}
            type="number"
            step="0.1"
            value={fieldData.area?.toString() || ''}
            onChange={(value) => setFieldData({ ...fieldData, area: parseFloat(value) || 0 })}
            error={errors.area}
          />

          <FormField
            label={t('field.cropLabel')}
            placeholder={t('field.cropPlaceholder')}
            value={fieldData.crop || ''}
            onChange={(value) => setFieldData({ ...fieldData, crop: value })}
            error={errors.crop}
          />

          <FormField
            label={t('field.plantingDateLabel')}
            placeholder={t('field.plantingDatePlaceholder')}
            type="date"
            value={fieldData.plantingDate || ''}
            onChange={(value) => setFieldData({ ...fieldData, plantingDate: value })}
          />
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => setStep(1)}
            disabled={isSubmitting}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('field.backButton')}
          </button>
          <button
            onClick={handleFieldSubmit}
            disabled={isSubmitting}
            className="flex-1 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? t('field.submitting') : t('field.finishButton')}
          </button>
        </div>
      </div>
    </OnboardingLayout>
  );
}

// Helper components
function OnboardingLayout({
  step,
  totalSteps,
  children,
}: {
  step: number;
  totalSteps: number;
  children: React.ReactNode;
}) {
  const t = useTranslations('auth.onboarding');

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Progress indicator */}
        <div className="mb-8">
          <p className="text-sm text-gray-500 text-center mb-4">
            {t('progress', { current: step, total: totalSteps })}
          </p>
          <div className="flex gap-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-2 rounded-full transition-colors ${
                  i < step ? 'bg-green-600' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">{children}</div>
      </div>
    </div>
  );
}

function BenefitCard({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="p-4 bg-green-50 rounded-lg text-center">
      <div className="text-3xl mb-2">{icon}</div>
      <p className="text-sm text-gray-700">{title}</p>
    </div>
  );
}

function FormField({
  label,
  placeholder,
  type = 'text',
  step,
  value,
  onChange,
  error,
}: {
  label: string;
  placeholder: string;
  type?: string;
  step?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
          error ? 'border-red-500' : 'border-gray-300'
        }`}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
