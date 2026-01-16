import "../styles/globals.css";
import { Inter } from "next/font/google";
import type { Metadata } from "next";
import type React from "react";
import Script from "next/script";
import { Providers } from "@/components/Providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Rouvis - Strategic Planning",
  description: "Strategic farm planning and analytics for farmers in Niigata, Japan",
  verification: {
    google: "_buOY562UV8w8naqEGmYVp8nt4J1s05tU4ugpWlyFcI",
  },
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Mobile performance optimizations */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes, viewport-fit=cover" />
        <meta name="theme-color" content="#059669" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Rouvis" />

        {/* Performance optimizations */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* Material Symbols (for icon ligatures like wb_sunny / warning / expand_more) */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `
.material-symbols-outlined{
  font-family:'Material Symbols Outlined', sans-serif;
  font-weight:normal;
  font-style:normal;
  font-size:1.25rem; /* Adjust icon size */
  line-height:1;
  letter-spacing:normal;
  text-transform:none;
  display:inline-block;
  white-space:nowrap;
  word-wrap:normal;
  direction:ltr;
  -webkit-font-feature-settings:'liga';
  -webkit-font-smoothing:antialiased;
  font-variation-settings:'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}
            `,
          }}
        />

        {/* Accessibility */}
        <meta name="format-detection" content="telephone=no" />

        {/* Theme bootstrap script */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var m=localStorage.getItem('theme')||'system';var d=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;var v=(m==='dark')||(m==='system'&&d);document.documentElement.classList.toggle('dark',v);}catch(e){}",
          }}
        />

        {/* Hide dev error overlay */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window === 'undefined') return;
                const style = document.createElement('style');
                style.textContent = 'iframe[src*="__nextjs"], [data-nextjs-dev-overlay], next-dev-overlay, [class*="nextjs"], body > div[role="dialog"], body > div[style*="position: fixed"] { display: none !important; visibility: hidden !important; opacity: 0 !important; pointer-events: none !important; }';
                document.head.appendChild(style);
                setTimeout(() => {
                  document.querySelectorAll('[data-nextjs-dev-overlay], next-dev-overlay, iframe[src*="__nextjs"]').forEach(el => el.remove());
                }, 100);
              })();
            `,
          }}
        />

        {/* ChatKit Script */}
        <Script
          src="https://cdn.platform.openai.com/deployments/chatkit/chatkit.js"
          strategy="afterInteractive"
        />
      </head>
      <body className={`${inter.className} antialiased`} suppressHydrationWarning>
        <Providers session={null}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
