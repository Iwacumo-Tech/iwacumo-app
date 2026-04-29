"use client";


import { useState, useEffect } from "react";
import { trpc } from "@/app/_providers/trpc-provider";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  Loader2, BadgeCheck, ShieldCheck, AlertTriangle,
  Building2, Hash, User, RefreshCw,
} from "lucide-react";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";



function SectionHeader({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="border-b-[1.5px] border-black pb-4 mb-8">
      <h1 className="text-3xl font-black uppercase italic tracking-tighter">
        {label}<span className="text-accent">.</span>
      </h1>
      {sub && <p className="text-xs font-medium text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function StatusBadge({ ready, label }: { ready: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-[9px] font-black uppercase tracking-widest border ${
      ready
        ? "bg-green-50 border-green-300 text-green-700"
        : "bg-amber-50 border-amber-300 text-amber-700"
    }`}>
      {ready
        ? <BadgeCheck size={10} />
        : <AlertTriangle size={10} />
      }
      {label}
    </span>
  );
}

function ConnectedAccountCard({
  account,
  onReplace,
}: {
  account: {
    bank_name:             string;
    account_name:          string;
    account_number_masked: string;
    is_verified:           boolean;
    subaccount_ready:      boolean;
    recipient_ready:       boolean;
    payout_ready:          boolean;
    blocking_reason_labels: string[];
    updated_at:            Date | string;
  };
  onReplace: () => void;
}) {
  const updatedAt = new Date(account.updated_at).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="border-[1.5px] border-black bg-white gumroad-shadow-sm">
      {/* Header strip */}
      <div className="flex items-center justify-between px-6 py-4 border-b-[1.5px] border-black bg-black/[0.02]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-black flex items-center justify-center">
            <Building2 size={14} className="text-accent" />
          </div>
          <div>
            <p className="font-black uppercase italic text-sm">{account.bank_name}</p>
            <p className="text-[9px] font-medium text-gray-400">Last updated {updatedAt}</p>
          </div>
        </div>
        {account.payout_ready ? (
          <BadgeCheck size={20} className="text-green-500" />
        ) : (
          <AlertTriangle size={20} className="text-amber-500" />
        )}
      </div>

      {/* Account details */}
      <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Account Name</p>
          <p className="font-black text-sm">{account.account_name}</p>
        </div>
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Account Number</p>
          <p className="font-black text-sm font-mono">{account.account_number_masked}</p>
        </div>
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">Status</p>
          <div className="flex flex-col gap-1.5">
            <StatusBadge ready={account.payout_ready} label={account.payout_ready ? "Payout ready" : "Payout blocked"} />
            <StatusBadge ready={account.subaccount_ready} label={account.subaccount_ready ? "Auto-split ready" : "Auto-split pending"} />
            <StatusBadge ready={account.recipient_ready}  label={account.recipient_ready  ? "Transfers ready"  : "Transfers pending"} />
          </div>
        </div>
      </div>

      {/* Explanation */}
      <div className="px-6 pb-5">
        {(!account.subaccount_ready || !account.recipient_ready) && (
          <div className="mb-4 space-y-2">
            <p className="text-[10px] font-medium text-amber-600 flex items-start gap-2">
              <AlertTriangle size={11} className="shrink-0 mt-0.5" />
              Automatic payout routing is still blocked until every Paystack registration step is ready.
            </p>
            <div className="space-y-1">
              {account.blocking_reason_labels.map((reason) => (
                <p key={reason} className="text-[10px] font-medium text-black/60">
                  • {reason}
                </p>
              ))}
            </div>
          </div>
        )}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={onReplace}
            className="h-9 px-4 text-[10px] border-[1.5px] border-black rounded-none font-black uppercase hover:bg-black hover:text-white"
          >
            <RefreshCw size={11} className="mr-2" />
            Change Account
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PaymentSettingsPage() {
  const { data: session } = useSession();
  const utils = trpc.useUtils();

  // ── Remote data ──────────────────────────────────────────────────────────
  const { data: existingAccount, isLoading: accountLoading } =
    trpc.getMyPaymentAccount.useQuery(undefined, { enabled: !!session?.user?.id });

  const { data: banks, isLoading: banksLoading } =
    trpc.listBanks.useQuery(undefined, { enabled: !!session?.user?.id, staleTime: 24 * 60 * 60 * 1000 });

  // ── Local form state ─────────────────────────────────────────────────────
  const [replacing,      setReplacing]      = useState(false);
  const [selectedBank,   setSelectedBank]   = useState<{ code: string; name: string } | null>(null);
  const [accountNumber,  setAccountNumber]  = useState("");
  const [bankSearch,     setBankSearch]     = useState("");
  const [verified,       setVerified]       = useState<{
    account_name: string;
    account_number: string;
  } | null>(null);

  // Reset verified whenever inputs change
  useEffect(() => { setVerified(null); }, [selectedBank, accountNumber]);

  // ── Mutations ────────────────────────────────────────────────────────────
  const verifyMutation = trpc.verifyBankAccount.useMutation({
    onSuccess: (data) => {
      setVerified(data);
      toast.success(`Account resolved: ${data.account_name}`);
    },
    onError: (e) => {
      toast.error(e.message || "Could not verify account. Check the number and try again.");
    },
  });

  const saveMutation = trpc.saveBankAccount.useMutation({
    onSuccess: (data) => {
      toast.success("Payout account saved successfully.");
      setReplacing(false);
      setSelectedBank(null);
      setAccountNumber("");
      setVerified(null);
      setBankSearch("");
      utils.getMyPaymentAccount.invalidate();
    },
    onError: (e) => {
      toast.error(e.message || "Failed to save account. Please try again.");
    },
  });

  // ── Derived state ────────────────────────────────────────────────────────
  const showForm       = !existingAccount || replacing;
  const canVerify      = !!selectedBank && accountNumber.length === 10 && !verifyMutation.isPending;
  const canSave        = !!verified && !!selectedBank;
  const filteredBanks  = (banks ?? []).filter(b =>
    b.name.toLowerCase().includes(bankSearch.toLowerCase())
  );

  const handleVerify = () => {
    if (!selectedBank || accountNumber.length !== 10) return;
    verifyMutation.mutate({ bank_code: selectedBank.code, account_number: accountNumber });
  };

  const handleSave = () => {
    if (!verified || !selectedBank) return;
    saveMutation.mutate({
      bank_code:      selectedBank.code,
      bank_name:      selectedBank.name,
      account_number: verified.account_number,
      account_name:   verified.account_name,
    });
  };

  if (accountLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={28} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 md:px-6">
      <SectionHeader
        label="Payout Settings"
        sub="Connect and fully register your payout account before automated earnings routing can happen."
      />

      {/* How it works */}
      <div className="mb-8 p-4 border-[1.5px] border-black/10 bg-black/[0.02] flex gap-3">
        <ShieldCheck size={14} className="shrink-0 mt-0.5 text-accent" />
        <div className="text-xs font-medium text-gray-600 space-y-1">
          <p>
            Your account number is verified live against your bank via Paystack.
            We also register the related Paystack subaccount and transfer recipient needed for automated routing.
          </p>
          <p>
            Your full account number is never shown in the UI after saving, and payout stays blocked until every registration step is ready.
          </p>
        </div>
      </div>

      {/* Existing account card */}
      {existingAccount && !replacing && (
        <ConnectedAccountCard
          account={existingAccount as any}
          onReplace={() => setReplacing(true)}
        />
      )}

      {/* Add / replace form */}
      {showForm && (
        <div className="border-[1.5px] border-black bg-white gumroad-shadow-sm">
          <div className="px-6 py-4 border-b-[1.5px] border-black bg-black/[0.02] flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
              <Building2 size={12} />
              {existingAccount ? "Replace Bank Account" : "Add Bank Account"}
            </p>
            {replacing && (
              <button
                type="button"
                onClick={() => { setReplacing(false); setVerified(null); setSelectedBank(null); setAccountNumber(""); }}
                className="text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100"
              >
                Cancel
              </button>
            )}
          </div>

          <div className="px-6 py-6 space-y-6">

            {/* Bank selector */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest">
                Bank *
              </Label>
              {banksLoading ? (
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Loader2 size={12} className="animate-spin" /> Loading banks…
                </div>
              ) : (
                <Select
                  value={selectedBank?.code ?? ""}
                  onValueChange={(code) => {
                    const bank = (banks ?? []).find(b => b.code === code);
                    setSelectedBank(bank ? { code: bank.code, name: bank.name } : null);
                  }}
                >
                  <SelectTrigger className="input-gumroad">
                    <SelectValue placeholder="Select your bank…" />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-black border-[1.5px] border-black rounded-none max-h-72">
                    {/* Search inside dropdown */}
                    <div className="px-3 py-2 border-b border-black/10">
                      <Input
                        placeholder="Search bank…"
                        value={bankSearch}
                        onChange={(e) => setBankSearch(e.target.value)}
                        className="h-8 text-xs border-[1.5px] border-black/20 rounded-none"
                        // Prevent the Select from closing when typing
                        onKeyDown={(e) => e.stopPropagation()}
                      />
                    </div>
                    {filteredBanks.length === 0 && (
                      <div className="px-3 py-3 text-xs text-gray-400">No banks found.</div>
                    )}
                    {filteredBanks.map(bank => (
                      <SelectItem key={bank.code} value={bank.code}>
                        {bank.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Account number */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest">
                Account Number *
              </Label>
              <div className="flex items-stretch gap-0">
                <div className="relative flex-1">
                  <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={10}
                    value={accountNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setAccountNumber(val);
                    }}
                    placeholder="0000000000"
                    className="input-gumroad pl-9 font-mono tracking-widest border-r-0"
                    disabled={verifyMutation.isPending || saveMutation.isPending}
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleVerify}
                  disabled={!canVerify}
                  className="h-10 px-5 border-[1.5px] border-black bg-black text-white font-black uppercase text-[10px] tracking-widest rounded-none hover:bg-accent hover:text-black transition-colors"
                >
                  {verifyMutation.isPending
                    ? <Loader2 size={12} className="animate-spin" />
                    : "Verify"
                  }
                </Button>
              </div>
              <p className="text-[10px] text-gray-400 font-medium">
                Must be exactly 10 digits (NUBAN format).
              </p>
            </div>

            {/* Verified account name confirmation */}
            {verified && (
              <div className="flex items-center gap-3 p-4 border-[1.5px] border-green-300 bg-green-50">
                <BadgeCheck size={18} className="text-green-600 shrink-0" />
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-green-600 mb-0.5">
                    Account Verified
                  </p>
                  <p className="font-black text-sm flex items-center gap-2">
                    <User size={12} className="text-green-600" />
                    {verified.account_name}
                  </p>
                  <p className="text-[10px] font-medium text-gray-500 mt-0.5">
                    Confirm this is the correct account holder before saving.
                  </p>
                </div>
              </div>
            )}

            {/* Save button */}
            <Button
              onClick={handleSave}
              disabled={!canSave || saveMutation.isPending}
              className="booka-button-primary w-full h-12 text-sm"
            >
              {saveMutation.isPending ? (
                <><Loader2 size={14} className="animate-spin mr-2" />Saving…</>
              ) : (
                "Save Payout Account"
              )}
            </Button>

            {!verified && (
              <p className="text-[10px] font-medium text-gray-400 text-center">
                You must verify your account number before saving.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
