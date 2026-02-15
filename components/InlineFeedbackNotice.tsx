'use client';

import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react';

type NoticeVariant = 'info' | 'success' | 'warning' | 'error';

type NoticeAction = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
};

type InlineFeedbackNoticeProps = {
  variant: NoticeVariant;
  message: string;
  title?: string;
  primaryAction?: NoticeAction;
  secondaryAction?: NoticeAction;
  className?: string;
};

function variantClasses(variant: NoticeVariant): string {
  if (variant === 'success') return 'border-emerald-200 bg-emerald-50 text-emerald-900';
  if (variant === 'warning') return 'border-amber-200 bg-amber-50 text-amber-900';
  if (variant === 'error') return 'border-rose-200 bg-rose-50 text-rose-900';
  return 'border-blue-200 bg-blue-50 text-blue-900';
}

function variantIcon(variant: NoticeVariant) {
  if (variant === 'success') return <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />;
  if (variant === 'warning') return <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />;
  if (variant === 'error') return <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />;
  return <Info className="mt-0.5 h-4 w-4 shrink-0" />;
}

export default function InlineFeedbackNotice(props: InlineFeedbackNoticeProps) {
  const { variant, message, title, primaryAction, secondaryAction, className } = props;

  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${variantClasses(variant)} ${className ?? ''}`}>
      <div className="flex items-start gap-2">
        {variantIcon(variant)}
        <div className="min-w-0 flex-1">
          {title ? <p className="text-sm font-semibold">{title}</p> : null}
          <p>{message}</p>

          {(primaryAction || secondaryAction) ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {primaryAction ? (
                <button
                  type="button"
                  onClick={primaryAction.onClick}
                  disabled={primaryAction.disabled}
                  className="inline-flex items-center rounded-md border border-current bg-white/70 px-3 py-1.5 text-xs font-semibold hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {primaryAction.label}
                </button>
              ) : null}
              {secondaryAction ? (
                <button
                  type="button"
                  onClick={secondaryAction.onClick}
                  disabled={secondaryAction.disabled}
                  className="inline-flex items-center rounded-md border border-transparent px-3 py-1.5 text-xs font-semibold underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {secondaryAction.label}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
