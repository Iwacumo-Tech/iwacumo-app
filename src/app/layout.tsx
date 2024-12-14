import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import TRPCProvider from "./_providers/trpc-provider";
import { SessionProvider } from "next-auth/react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Booka",
  description: "",
};

export default function RootLayout ({ children }: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>

        <SessionProvider>
          <TRPCProvider>
            {children}
            <Toaster />
          </TRPCProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
