import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import TRPCProvider from "./_providers/trpc-provider";
import { SessionProvider } from "next-auth/react";
import CartDrawer from "@/components/shared/CartDrawer";
import { PublicTranslationProvider } from "@/components/shared/translation-provider";
import { Analytics } from "@vercel/analytics/next";
import BeforeInstallPrompt from "@/components/shared/BeforeInstallPrompt";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Iwacumo",
  description: "Your personal library, available anywhere",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Iwacumo",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    apple: [
      { url: "/icons/icon-152x152.png", sizes: "152x152" },
      { url: "/icons/icon-192x192.png", sizes: "192x192" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#FFD700",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout ({ children }: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <PublicTranslationProvider>
          <SessionProvider>
            <TRPCProvider>
              {children}
              <Toaster />
              <CartDrawer />
              <BeforeInstallPrompt />
            </TRPCProvider>
          </SessionProvider>
        </PublicTranslationProvider>
        <Analytics />
      </body> 
    </html>
  );
}
