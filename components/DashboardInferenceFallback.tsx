type DashboardInferenceFallbackProps = {
  inferenceTitle: string;
  inferenceBody: string;
};

export default function DashboardInferenceFallback({
  inferenceTitle,
  inferenceBody,
}: DashboardInferenceFallbackProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto max-w-7xl space-y-4 px-4 py-8">
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

          <div className="mt-4 animate-pulse space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="h-3 w-28 rounded bg-slate-200" />
              <div className="h-5 w-24 rounded-full bg-slate-200" />
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="h-2 w-36 rounded bg-slate-200" />
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-4">
                <div className="h-10 rounded-lg border border-slate-200 bg-white" />
                <div className="h-10 rounded-lg border border-slate-200 bg-white" />
                <div className="h-10 rounded-lg border border-slate-200 bg-white" />
                <div className="h-10 rounded-lg border border-slate-200 bg-white" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="h-16 rounded-xl border border-slate-200 bg-slate-50" />
              <div className="h-16 rounded-xl border border-slate-200 bg-slate-50" />
              <div className="h-16 rounded-xl border border-slate-200 bg-slate-50" />
            </div>

            <div className="h-2 w-full rounded-full bg-slate-100" />
            <div className="h-10 w-44 rounded-xl border border-amber-200 bg-amber-50" />
            <div className="space-y-2">
              <div className="h-12 rounded-lg border border-slate-200 bg-white" />
              <div className="h-12 rounded-lg border border-slate-200 bg-white" />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
