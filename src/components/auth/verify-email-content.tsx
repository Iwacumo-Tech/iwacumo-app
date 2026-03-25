"use client";
 
import { useSearchParams } from "next/navigation";
import { Mail, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { ResendVerificationButton } from "./resend-verification-button";
 
export function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const error = searchParams.get("error");
 
  // ── Error states ────────────────────────────────────────────
  if (error) {
    const errorConfig = {
      expired: {
        icon: RefreshCw,
        title: "Link Expired",
        message:
          "Your verification link has expired. Links are valid for 24 hours. Request a new one below.",
        showResend: true,
      },
      used: {
        icon: CheckCircle2,
        title: "Already Verified",
        message:
          "This link has already been used. If your account is verified, go ahead and sign in.",
        showResend: false,
      },
      invalid: {
        icon: AlertTriangle,
        title: "Invalid Link",
        message:
          "This verification link isn't valid. It may have been copied incorrectly. Request a fresh one below.",
        showResend: true,
      },
      missing_token: {
        icon: AlertTriangle,
        title: "Missing Token",
        message: "No verification token was provided in the link.",
        showResend: true,
      },
    } as const;
 
    const config =
      errorConfig[error as keyof typeof errorConfig] ?? errorConfig.invalid;
    const Icon = config.icon;
 
    return (
      <div className="bg-white border-4 border-primary p-8 gumroad-shadow space-y-6">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-16 h-16 border-4 border-black flex items-center justify-center">
            <Icon className="size-8" />
          </div>
          <h1 className="text-2xl font-black uppercase italic tracking-tighter">
            {config.title}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {config.message}
          </p>
        </div>
 
        {config.showResend && (
          <div className="flex flex-col items-center gap-3">
            <ResendVerificationButton email={email} />
            {!email && (
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Enter your email on the{" "}
                <Link href="/register" className="underline">
                  register page
                </Link>{" "}
                first
              </p>
            )}
          </div>
        )}
 
        <div className="text-center pt-2">
          <Link
            href="/login"
            className="text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }
 
  // ── Default: "Check your inbox" state ───────────────────────
  return (
    <div className="bg-white border-4 border-primary p-8 gumroad-shadow space-y-6">
      <div className="flex flex-col items-center text-center space-y-4">
        {/* Animated envelope */}
        <div className="w-20 h-20 bg-accent border-4 border-black flex items-center justify-center gumroad-shadow">
          <Mail className="size-10" />
        </div>
 
        <div className="space-y-2">
          <h1 className="text-2xl font-black uppercase italic tracking-tighter">
            Check Your Inbox
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We&apos;ve sent a verification link to{" "}
            {email ? (
              <strong className="text-primary">{email}</strong>
            ) : (
              "your email address"
            )}
            . Click the link to activate your account.
          </p>
        </div>
 
        <div className="w-full border-t border-border pt-4 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Didn&apos;t get it? Check your spam folder, or:
          </p>
          <ResendVerificationButton email={email} />
        </div>
      </div>
 
      <div className="text-center">
        <Link
          href="/login"
          className="text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
        >
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}