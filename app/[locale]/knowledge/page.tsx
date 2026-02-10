import Link from 'next/link';
import { BookOpen, MessageCircle } from 'lucide-react';
import { notFound } from 'next/navigation';
import { getWebFeatureFlags } from '@/lib/feature-flags';

export default async function KnowledgePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const featureFlags = getWebFeatureFlags();

  if (!featureFlags.knowledgePage) {
    notFound();
  }

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
        <BookOpen className="w-6 h-6 text-purple-600" />
        知識・マニュアル
      </h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900">準備中</h2>
        <p className="text-sm text-gray-600 mt-2">
          マニュアル記事・ガイド検索は今後追加予定です。今はチャットで質問すると、状況に合わせて案内できます。
        </p>

        <Link
          href={`/${locale}/chat`}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          チャットで質問する
        </Link>
      </div>
    </div>
  );
}
