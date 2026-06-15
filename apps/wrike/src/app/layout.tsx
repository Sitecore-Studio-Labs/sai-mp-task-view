import "./globals.css";

import { Toaster } from "@mp/ui";
import type { Metadata } from "next";

import { Providers } from "./Providers";

export const metadata: Metadata = {
  title: "Wrike Task Manager",
  description: "Marketplace extension with Wrike connectivity and React Query.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
