'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

type Article = {
  id: string;
  title: string;
  excerpt: string;
  author: string;
  authorRole: string;
  date: string;
  readTime: string;
  category: string;
  imageUrl?: string;
  likes: number;
  comments: number;
};

export function ArticleList() {
  const t = useTranslations();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  
  // Mock data for demonstration
  const articles: Article[] = [
    {
      id: '1',
      title: 'Sustainable Irrigation Practices for Rice Fields',
      excerpt: 'Discover how modern irrigation techniques can reduce water usage while maintaining crop health.',
      author: 'Keiko Sato',
      authorRole: 'Agronomist',
      date: 'May 15, 2025',
      readTime: '8 min',
      category: 'Water Management',
      imageUrl: '/community/irrigation.jpg',
      likes: 86,
      comments: 23,
    },
    {
      id: '2',
      title: 'Combating Rice Blast Disease: Early Detection and Treatment',
      excerpt: 'Learn to identify early signs of rice blast and effective organic treatment options.',
      author: 'Hiroshi Nakamura',
      authorRole: 'Organic Specialist',
      date: 'May 12, 2025',
      readTime: '10 min',
      category: 'Pest Control',
      imageUrl: '/community/rice-disease.jpg',
      likes: 104,
      comments: 35,
    },
    {
      id: '3',
      title: 'Niigata\'s Changing Climate: Adapting Rice Varieties',
      excerpt: 'An analysis of climate trends in Niigata and recommended rice varieties for changing conditions.',
      author: 'Takeshi Watanabe',
      authorRole: 'Climate Researcher',
      date: 'May 8, 2025',
      readTime: '15 min',
      category: 'Climate',
      imageUrl: '/community/climate.jpg',
      likes: 92,
      comments: 28,
    },
    {
      id: '4',
      title: 'Optimizing Soil Health with Cover Crops',
      excerpt: 'How strategic use of cover crops between rice seasons can improve soil fertility naturally.',
      author: 'Yuki Tanaka',
      authorRole: 'Soil Scientist',
      date: 'May 5, 2025',
      readTime: '7 min',
      category: 'Soil Management',
      imageUrl: '/community/soil-health.jpg',
      likes: 75,
      comments: 19,
    },
    {
      id: '5',
      title: 'Smart Farming Technology for Small-Scale Farms',
      excerpt: 'Affordable IoT and automation solutions specifically designed for Niigata\'s small farmers.',
      author: 'Akira Suzuki',
      authorRole: 'AgTech Specialist',
      date: 'May 1, 2025',
      readTime: '12 min',
      category: 'Technology',
      imageUrl: '/community/smart-farm.jpg',
      likes: 118,
      comments: 42,
    },
  ];

  const categories = ['Water Management', 'Pest Control', 'Climate', 'Soil Management', 'Technology'];
  
  const filteredArticles = activeCategory 
    ? articles.filter(article => article.category === activeCategory)
    : articles;

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">{t('community.recent_articles')}</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-3 py-1 text-xs rounded-lg ${
              activeCategory === null
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t('community.all')}
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-3 py-1 text-xs rounded-lg ${
                activeCategory === category
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>
      
      <div className="divide-y divide-gray-200">
        {filteredArticles.map((article) => (
          <div key={article.id} className="py-4 flex">
            {article.imageUrl && (
              <div className="mr-4 w-24 h-24 md:w-32 md:h-32 flex-shrink-0">
                <img
                  src={article.imageUrl}
                  alt={article.title}
                  className="w-full h-full object-cover rounded-lg"
                  onError={(e) => {
                    // Fallback for missing image in demo
                    (e.target as HTMLImageElement).src = `https://via.placeholder.com/150x150?text=${article.category}`;
                  }}
                />
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center text-sm text-gray-500 mb-1">
                <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">{article.category}</span>
                <span className="mx-2">•</span>
                <span>{article.date}</span>
                <span className="mx-2">•</span>
                <span>{article.readTime} {t('community.read')}</span>
              </div>
              <h3 className="text-lg font-semibold mb-1 hover:text-primary-600">
                <a href="#">{article.title}</a>
              </h3>
              <p className="text-gray-600 text-sm mb-2">{article.excerpt}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs mr-2">
                    {article.author.charAt(0)}
                  </div>
                  <span className="text-sm font-medium">{article.author}</span>
                  <span className="text-xs text-gray-500 ml-2">{article.authorRole}</span>
                </div>
                <div className="flex items-center text-gray-500 text-xs space-x-3">
                  <span className="flex items-center">
                    <span className="mr-1">👍</span> {article.likes}
                  </span>
                  <span className="flex items-center">
                    <span className="mr-1">💬</span> {article.comments}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-6 flex justify-center">
        <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
          {t('community.load_more')}
        </button>
      </div>
    </div>
  );
}
