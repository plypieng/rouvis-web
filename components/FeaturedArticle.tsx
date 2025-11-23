export function FeaturedArticle() {
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="relative h-64">
        <img
          src="/community/rice-field-feature.jpg"
          alt="Traditional rice terraces in Niigata"
          className="w-full h-full object-cover"
          // Fallback for missing image in demo
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1464638681273-0962e9b53566?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        <div className="absolute bottom-0 left-0 p-4 text-white">
          <span className="inline-block bg-primary-600 text-white text-xs px-2 py-1 rounded mb-2">
            Featured Article
          </span>
          <h1 className="text-xl md:text-2xl font-bold">Traditional Rice Cultivation Techniques in Modern Niigata Farming</h1>
        </div>
      </div>
      
      <div className="p-4 md:p-6">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 bg-primary-100 text-primary-600 flex items-center justify-center rounded-full mr-3">
            TY
          </div>
          <div>
            <p className="font-medium">Tanaka Yamamoto</p>
            <p className="text-sm text-gray-500">May 10, 2025 • 12 min read</p>
          </div>
        </div>
        
        <p className="text-gray-700 mb-4">
          Niigata prefecture has been Japan's leading rice producer for generations. In this comprehensive guide, 
          I share the traditional techniques passed down through my family for over 40 years and how they can be 
          adapted to modern farming challenges, including climate change and sustainable agriculture practices.
        </p>
        
        <h2 className="text-lg font-medium mb-2">Key Takeaways:</h2>
        <ul className="list-disc list-inside space-y-1 text-gray-700 mb-4">
          <li>Water management techniques unique to Niigata's climate conditions</li>
          <li>Traditional pest control methods that reduce chemical dependency</li>
          <li>Soil preparation practices that have stood the test of time</li>
          <li>Adapting ancestral knowledge to modern climate challenges</li>
        </ul>
        
        <blockquote className="border-l-4 border-primary-600 pl-4 italic text-gray-600 my-4">
          "The wisdom of generations past gives us the foundation we need to face the agricultural challenges of tomorrow.
          Niigata's farming traditions are not just our heritage—they're our future."
        </blockquote>
        
        <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-100">
          <div className="flex items-center text-gray-500 text-sm space-x-4">
            <span className="flex items-center">
              <span className="mr-1">👍</span> 128 likes
            </span>
            <span className="flex items-center">
              <span className="mr-1">💬</span> 45 comments
            </span>
          </div>
          
          <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm">
            Read Full Article
          </button>
        </div>
      </div>
    </div>
  );
}
