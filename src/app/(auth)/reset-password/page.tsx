import { Suspense } from "react";
import { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
 
export const metadata: Metadata = {
  title: "Reset Password — iwacumo",
  description: "Choose a new password for your iwacumo account.",
};
 
export default function ResetPasswordPage() {
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
            Set a New Password
          </p>
        </div>
 
        <Suspense
          fallback={
            <div className="h-64 flex items-center justify-center">
              <div className="w-10 h-10 border-4 border-black border-t-accent animate-spin" />
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}