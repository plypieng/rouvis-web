import Link from 'next/link';

export type ChecklistItem = {
  id: string;
  label: string;
  done: boolean;
  href: string;
};

export default function FirstWeekChecklist({
  items,
  show,
}: {
  items: ChecklistItem[];
  show: boolean;
}) {
  if (!show) return null;

  const completed = items.filter((item) => item.done).length;
  const total = items.length;

  return (
    <section className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-base font-bold text-indigo-900">最初の1週間チェックリスト</h2>
        <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-indigo-700">
          {completed}/{total}
        </span>
      </div>

      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm ${
              item.done
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-white bg-white text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <span aria-hidden="true">{item.done ? '✓' : '○'}</span>
              <span>{item.label}</span>
            </span>
            {!item.done && (
              <Link
                href={item.href}
                className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 hover:underline"
              >
                進める →
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
