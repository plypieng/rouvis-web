import React from 'react';
import Image from 'next/image';

export const Logo = ({ className }: { className?: string }) => {
    // Use the logo.svg located in the public directory
    return (
        <div className={`relative ${className}`}>
            {/* Using a standard img tag because local SVGs are sometimes tricky with next/image if not configured, 
            but standard img works universally for public assets which this seems to be. 
            However, for better control we can try a simple img first or next/image if dimensions are known.
            Given className usually handles width/height, we'll try to let CSS control it.
        */}
            <img
                src="/logo_text.png"
                alt="Rouvis Logo"
                className="w-full h-full object-contain"
            />
        </div>
    );
};

export default Logo;
