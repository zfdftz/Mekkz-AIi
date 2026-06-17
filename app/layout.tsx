import "./globals.css";
import type { Metadata } from "next";
import Script from "next/script";
import { LanguageProvider } from "@/components/language-provider";
import { AuthSessionBootstrap } from "@/components/auth-session-bootstrap";
import { AchievementProvider } from "@/components/rewards/achievement-provider";
import { AdSenseScript } from "@/components/adsense-script";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mekkzai.com";
const siteDescription =
  "mekkz AI is your multilingual AI assistant: chat, create images, and analyze photos. Start free — fast, modern, and unique.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "mekkz AI — Multilingual AI Chat & Images",
    template: "%s | mekkz AI"
  },
  description: siteDescription,
  applicationName: "mekkz AI",
  keywords: [
    "mekkz AI",
    "AI Chat",
    "Multilingual AI",
    "Image generation AI",
    "AI assistant",
    "Free AI chat"
  ],
  authors: [{ name: "mekkz AI", url: siteUrl }],
  creator: "mekkz AI",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "mekkz AI",
    title: "mekkz AI — Multilingual AI Chat & Images",
    description: siteDescription,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "mekkz AI Logo"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "mekkz AI — Multilingual AI Chat & Images",
    description: siteDescription,
    images: ["/og-image.png"]
  },
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/favicon.png"
  },
  robots: {
    index: true,
    follow: true
  },
  appleWebApp: {
    capable: true,
    title: "mekkz AI",
    statusBarStyle: "black-translucent"
  },
  manifest: "/manifest.webmanifest"
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#050810" },
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" }
  ]
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-color="violet" suppressHydrationWarning>
      <body>
        <Script id="theme-init" strategy="beforeInteractive">
          {`(function(){try{var t=localStorage.getItem("theme")||"dark";var c=localStorage.getItem("color-theme")||"violet";var l=localStorage.getItem("mekkz_lang");var r=document.documentElement;r.classList.toggle("light",t==="light");r.classList.toggle("dark",t==="dark");r.setAttribute("data-color",c);if(l){r.lang=l;}}catch(e){}})();`}
        </Script>
        <AdSenseScript />
        <LanguageProvider>
          <AuthSessionBootstrap />
          <AchievementProvider>{children}</AchievementProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
