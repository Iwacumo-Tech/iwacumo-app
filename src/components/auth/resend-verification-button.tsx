"use client";
 
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Send } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
 
interface ResendVerificationButtonProps {
  email: string;
  /** Optional: compact style for inline use in error banners */
  compact?: boolean;
}
 
export function ResendVerificationButton({
  email,
  compact = false,
}: ResendVerificationButtonProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0); // seconds remaining
 
  // Countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);
 
  const handleResend = async () => {
    if (!email || cooldown > 0) return;
 
    setLoading(true);
    try {
      const res = await fetch("/api/verification/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
 
      const data = await res.json();
 
      if (res.status === 429 || data.error === "RATE_LIMITED") {
        setCooldown(60);
        toast({
          title: "Slow down",
          description: "Please wait 60 seconds before requesting another email.",
        });
        return;
      }
 
      // Success (or silent no-op for unknown emails)
      setCooldown(60);
      toast({
        title: "Verification email sent",
        description: "Check your inbox and spam folder.",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Something went wrong",
        description: "Please try again in a moment.",
      });
    } finally {
      setLoading(false);
    }
  };
 
  const isDisabled = loading || cooldown > 0 || !email;
 
  if (compact) {
    return (
      <button
        onClick={handleResend}
        disabled={isDisabled}
        className="text-[11px] font-black uppercase tracking-widest underline underline-offset-2 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? (
          "Sending..."
        ) : cooldown > 0 ? (
          `Resend in ${cooldown}s`
        ) : (
          "Resend verification email"
        )}
      </button>
    );
  }
 
  return (
    <Button
      onClick={handleResend}
      disabled={isDisabled}
      variant="outline"
      className="booka-button-secondary gap-2"
    >
      {loading ? (
        <>
          <Loader2 className="animate-spin size-4" />
          Sending...
        </>
      ) : cooldown > 0 ? (
        `Resend in ${cooldown}s`
      ) : (
        <>
          <Send className="size-4" />
          Resend Verification Email
        </>
      )}
    </Button>
  );
}