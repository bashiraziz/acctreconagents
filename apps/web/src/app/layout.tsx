import type { Metadata } from "next";
import Script from "next/script";
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
  title: "Rowshni - Shedding Light on Your Ledger",
  description:
    "AI-powered reconciliation that illuminates variances, detects errors, and brings clarity to your month-end close. Intelligent GL-to-subledger reconciliation with multi-agent AI analysis.",
  keywords: ["reconciliation", "accounting", "AI", "ledger", "GL", "subledger", "variance detection", "month-end close"],
  authors: [{ name: "Rowshni" }],
  openGraph: {
    title: "Rowshni - Shedding Light on Your Ledger",
    description: "AI-powered reconciliation that illuminates variances and brings clarity to your month-end close.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Script
          src="https://cdn.platform.openai.com/deployments/chatkit/chatkit.js"
          strategy="beforeInteractive"
        />
        {children}
      </body>
    </html>
  );
}
