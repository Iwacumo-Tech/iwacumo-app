"use client";
 
import { Clock, Mail, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";
 
export default function KycPendingPage() {
  const { data: session } = useSession();
  const isAuthor = session?.activeProfile === "author";
  return (
    <div className="max-w-lg mx-auto space-y-10 py-12">
 
      {/* ── Icon ─────────────────────────────────────────────── */}
      <div className="flex flex-col items-center text-center space-y-6">
        <div className="w-24 h-24 bg-accent border-4 border-black gumroad-shadow flex items-center justify-center">
          <Clock className="size-12" />
        </div>
 
        <div className="space-y-3">
          <h1 className="text-4xl font-black uppercase italic tracking-tighter">
            Under Review<span className="text-accent">.</span>
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your {isAuthor ? "verification" : "KYC documents"} have been submitted and are being reviewed by our team.
            This usually takes <strong>1–2 business days</strong>.
          </p>
        </div>
      </div>
 
      {/* ── What happens next ───────────────────────────────── */}
      <div className="bg-white border-4 border-black p-8 gumroad-shadow space-y-5">
        <h3 className="font-black uppercase italic tracking-tighter border-b-2 border-black pb-3">
          What Happens Next
        </h3>
 
        {[
          {
            icon: ShieldCheck,
            title: "Manual Review",
            desc: isAuthor
              ? "Our compliance team verifies your author identity and supporting documents."
              : "Our compliance team verifies your identity and business documents.",
          },
          {
            icon: Mail,
            title: "Email Notification",
            desc: "You'll receive an email once your KYC is approved or if any action is needed.",
          },
          {
            icon: Clock,
            title: "1–2 Business Days",
            desc: "Most reviews are completed within two business days.",
          },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex items-start gap-4">
            <div className="w-9 h-9 border-2 border-black flex items-center justify-center shrink-0">
              <Icon className="size-4" />
            </div>
            <div>
              <p className="font-black uppercase text-[11px] tracking-widest">{title}</p>
              <p className="text-sm opacity-60 mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>
 
      {/* ── Actions ──────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <Button
          variant="outline"
          className="booka-button-secondary h-12"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          Sign Out
        </Button>
        <p className="text-center text-[10px] font-bold uppercase tracking-widest opacity-40">
          Questions?{" "}
          <Link href="mailto:support@iwacumo.com" className="underline">
            Contact support
          </Link>
        </p>
      </div>
    </div>
  );
}
 
