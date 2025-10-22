import "../styles/globals.css";
import { Inter } from "next/font/google";
import type { Metadata } from "next";
import type React from "react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Rouvis - Strategic Planning",
  description: "Strategic farm planning and analytics for farmers in Niigata, Japan",
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
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

        {/* Accessibility */}
        <meta name="format-detection" content="telephone=no" />

        {/* Theme bootstrap script */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var m=localStorage.getItem('theme')||'system';var d=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;var v=(m==='dark')||(m==='system'&&d);document.documentElement.classList.toggle('dark',v);}catch(e){}",
          }}
        />

        {/* ChatKit Script */}
        <script src="https://cdn.platform.openai.com/deployments/chatkit/chatkit.js" async />
      </head>
      <body className={`${inter.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}
