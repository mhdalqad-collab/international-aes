import type { Metadata } from "next";
import "./fonts.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Automated Engineering Systems | Integrated Industrial Consulting",
  description: "Syria’s leading consulting house brings engineering, technology and management together in one team—from diagnosing the challenge and shaping decisions to supervising implementation and measuring impact.",
  icons: {
    icon: "/aes-brand-icon.svg",
    shortcut: "/aes-brand-icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preload" href="/fonts/22a5144ee8d83bca-s.p.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/7d4881bb7e1bf84d-s.p.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/b261c59b2d76913d-s.p.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
