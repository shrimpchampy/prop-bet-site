import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Prop Bet Pool",
  description: "Custom prop bet pool for Super Bowl, Oscars, and more!",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}
      >
        <div style={{ flex: '1 0 auto' }}>
          {children}
        </div>
        <footer style={{ 
          padding: '1rem', 
          textAlign: 'center', 
          borderTop: '1px solid #e5e7eb', 
          backgroundColor: '#f9fafb',
          marginTop: 'auto',
          width: '100%',
          flexShrink: 0
        }}>
          <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
            Copyright © 2026 210PS Productions, LLC
            <br />
            For entertainment/marketing purposes only.
          </p>
        </footer>
      </body>
    </html>
  );
}
