type DashboardInferenceFallbackProps = {
  inferenceTitle: string;
  inferenceBody: string;
};

export default function DashboardInferenceFallback({
  inferenceTitle,
  inferenceBody,
}: DashboardInferenceFallbackProps) {
  return (
    <section
      role="status"
      aria-live="polite"
      aria-busy="true"
      data-testid="dashboard-inference-loading"
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-blue-200 bg-blue-50">
          <span
            aria-hidden
            className="h-4 w-4 animate-spin rounded-full border-2 border-blue-300 border-t-blue-600"
          />
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-900">{inferenceTitle}</p>
          <p className="mt-1 text-xs text-slate-600">{inferenceBody}</p>
        </div>
      </div>

      <div className="mt-4 animate-pulse space-y-2">
        <div className="h-10 rounded-lg border border-slate-200 bg-slate-50" />
        <div className="h-10 rounded-lg border border-slate-200 bg-slate-50" />
        <div className="h-2 w-full rounded-full bg-slate-100" />
      </div>
    </section>
  );
}
