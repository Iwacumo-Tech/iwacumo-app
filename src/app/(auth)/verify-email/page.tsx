"use client";

import { Suspense } from "react";
import Link from "next/link";
import { VerifyEmailContent } from "@/components/auth/verify-email-content";


export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Link href="/" className="text-4xl font-black uppercase italic tracking-tighter">
            Iwacumo<span className="text-accent">.</span>
          </Link>
        </div>
        <Suspense fallback={
          <div className="h-64 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-black border-t-accent animate-spin" />
          </div>
        }>
          <VerifyEmailContent />
        </Suspense>
      </div>
    </div>
  );
}