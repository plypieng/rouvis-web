'use client';

import { useTranslations } from 'next-intl';
import { DashboardHeader } from '../../../components/DashboardHeader';
import { DashboardCard } from '../../../components/DashboardCard';
import { KnowledgeSearch } from '../../../components/KnowledgeSearch';
import { FeaturedArticle } from '../../../components/FeaturedArticle';
import { ArticleList } from '../../../components/ArticleList';

export default function CommunityPage() {
  const t = useTranslations();
  
  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <DashboardHeader title={t('community.title')} />
      
      <div className="w-full max-w-3xl mx-auto mb-8">
        <KnowledgeSearch />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <DashboardCard title={t('community.featured')}>
            <FeaturedArticle />
          </DashboardCard>
        </div>
        
        <div>
          <DashboardCard title={t('community.categories')}>
            <div className="space-y-2">
              {['rice', 'vegetables', 'fruits', 'soil', 'equipment', 'climate'].map((category) => (
                <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
                  <span className="capitalize">{category}</span>
                  <span className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full">
                    {Math.floor(Math.random() * 50)}
                  </span>
                </div>
              ))}
            </div>
          </DashboardCard>
        </div>
      </div>
      
      <DashboardCard title={t('community.recent')}>
        <ArticleList />
      </DashboardCard>
    </div>
  );
}
