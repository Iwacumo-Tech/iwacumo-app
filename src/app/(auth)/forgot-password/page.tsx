import { Suspense } from "react";
import { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
 
export const metadata: Metadata = {
  title: "Forgot Password — iwacumo",
  description: "Reset your iwacumo account password.",
};
 
export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Link
            href="/"
            className="text-4xl font-black uppercase italic tracking-tighter"
          >
            Iwacumo<span className="text-accent">.</span>
          </Link>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground mt-2">
            Account Recovery
          </p>
        </div>
 
        <Suspense
          fallback={
            <div className="h-64 flex items-center justify-center">
              <div className="w-10 h-10 border-4 border-black border-t-accent animate-spin" />
            </div>
          }
        >
          <ForgotPasswordForm />
        </Suspense>
 
        <div className="text-center">
          <Link
            href="/login"
            className="text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
          >
            ← Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}