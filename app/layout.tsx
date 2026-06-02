import "./globals.css";
import type { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "mekkz AI",
  description: "Premium AI assistant app"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de" data-color="violet" suppressHydrationWarning>
      <body>
        <Script id="theme-init" strategy="beforeInteractive">
          {`(function(){try{var t=localStorage.getItem("theme")||"dark";var c=localStorage.getItem("color-theme")||"violet";var r=document.documentElement;r.classList.toggle("light",t==="light");r.classList.toggle("dark",t==="dark");r.setAttribute("data-color",c);}catch(e){}})();`}
        </Script>
        {children}
      </body>
    </html>
  );
}
