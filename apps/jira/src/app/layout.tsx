import "./globals.css";

import { Toaster } from "@mp/ui";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";

import { Providers } from "./Providers";

export const metadata: Metadata = {
  title: "Jira Task Management Extension",
  description: "Marketplace extension with Jira connectivity and React Query.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`antialiased`}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
