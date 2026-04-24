"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/app/_providers/trpc-provider";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { uploadImage } from "@/lib/server";
import { Loader2, Upload, CheckCircle2, AlertCircle } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

// ── Types ─────────────────────────────────────────────────────
interface KycRequirements {
  require_id:               boolean;
  require_business_reg:     boolean;
  require_proof_of_address: boolean;
}

interface KycFormProps {
  publisherId?: string;
  authorId?: string;
  mode?: "publisher" | "author";
  existingKyc?: any;
  requirements: KycRequirements;
}

// ── Build schema dynamically based on requirements ────────────
// This prevents Zod from requiring fields the admin has turned off.
function buildSchema(req: KycRequirements) {
  return z.object({
    // Identity — always collected if require_id is on
    id_document_type: req.require_id
      ? z.enum(["passport", "national_id", "drivers_license"], { required_error: "Select an ID type" })
      : z.enum(["passport", "national_id", "drivers_license"]).optional(),
    legal_name:   req.require_id ? z.string().min(1, "Legal name is required")   : z.string().optional(),
    phone_number: req.require_id ? z.string().min(1, "Phone number is required") : z.string().optional(),
    id_document_url: req.require_id
      ? z.string().min(1, "Please upload your ID document")
      : z.string().optional(),

    // Business registration
    business_name:    req.require_business_reg ? z.string().min(1, "Business name is required")    : z.string().optional(),
    business_address: req.require_business_reg ? z.string().min(1, "Business address is required") : z.string().optional(),
    business_reg_url: req.require_business_reg
      ? z.string().min(1, "Please upload your business registration document")
      : z.string().optional(),

    // Proof of address
    proof_of_address_url: req.require_proof_of_address
      ? z.string().min(1, "Please upload your proof of address")
      : z.string().optional(),
  });
}

type FormValues = {
  id_document_type?:    "passport" | "national_id" | "drivers_license";
  legal_name?:          string;
  phone_number?:        string;
  id_document_url?:     string;
  business_name?:       string;
  business_address?:    string;
  business_reg_url?:    string;
  proof_of_address_url?: string;
};

// ── File upload field ─────────────────────────────────────────
function FileUploadField({
  label, hint, fieldName, form,
}: {
  label: string; hint: string;
  fieldName: keyof FormValues; form: any;
}) {
  const [uploading, setUploading]   = useState(false);
  const [uploadError, setUploadError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const value    = form.watch(fieldName) as string | undefined;
  const error    = form.formState.errors[fieldName]?.message as string | undefined;

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Basic size check — 10MB
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("File too large. Max 10MB.");
      return;
    }

    setUploading(true);
    setUploadError("");

    try {
      const url = await uploadImage(file);
      form.setValue(fieldName, url, { shouldValidate: true });
    } catch (err: any) {
      setUploadError("Upload failed. Please try again.");
      console.error("[kyc upload]", err);
    } finally {
      setUploading(false);
    }
  };

  const hasError = !!error || !!uploadError;

  return (
    <FormField
      name={fieldName as string}
      control={form.control}
      render={() => (
        <FormItem>
          <FormLabel className="font-black uppercase text-[10px] tracking-widest">
            {label}
          </FormLabel>
          <p className="text-[10px] opacity-50 -mt-1">{hint}</p>

          <input
            ref={inputRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={handleFile}
          />

          {value ? (
            // Uploaded state
            <div className="flex items-center gap-3 border-2 border-black bg-accent p-3">
              <CheckCircle2 className="size-4 shrink-0" />
              <span className="text-[11px] font-black uppercase tracking-wide flex-1 truncate">
                Document uploaded ✓
              </span>
              <button
                type="button"
                onClick={() => {
                  form.setValue(fieldName, "", { shouldValidate: true });
                  if (inputRef.current) inputRef.current.value = "";
                }}
                className="text-[10px] font-black uppercase underline shrink-0 hover:text-red-600"
              >
                Replace
              </button>
            </div>
          ) : (
            // Empty state — red border if there's a validation error
            <div
              className={`border-2 ${hasError ? "border-red-500 bg-red-50" : "border-black"}`}
            >
              <Button
                type="button"
                variant="ghost"
                disabled={uploading}
                onClick={() => inputRef.current?.click()}
                className="w-full h-14 gap-2 rounded-none font-black uppercase text-[11px] tracking-widest hover:bg-accent"
              >
                {uploading ? (
                  <><Loader2 className="animate-spin size-4" />Uploading...</>
                ) : (
                  <><Upload className="size-4" />Upload File</>
                )}
              </Button>
            </div>
          )}

          {/* Show Zod error OR upload error */}
          {(error || uploadError) && (
            <div className="flex items-center gap-1.5 mt-1">
              <AlertCircle className="size-3 text-red-500 shrink-0" />
              <p className="text-xs text-red-600 font-bold">
                {error || uploadError}
              </p>
            </div>
          )}
        </FormItem>
      )}
    />
  );
}

// ── Main form ─────────────────────────────────────────────────
export function KycForm({ publisherId, authorId, mode = "publisher", existingKyc, requirements }: KycFormProps) {
  const { toast } = useToast();
  const router    = useRouter();

  const schema = buildSchema(requirements);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      id_document_type:     existingKyc?.id_document_type     ?? undefined,
      legal_name:           existingKyc?.legal_name           ?? "",
      phone_number:         existingKyc?.phone_number         ?? "",
      id_document_url:      existingKyc?.id_document_url      ?? "",
      business_name:        existingKyc?.business_name        ?? "",
      business_address:     existingKyc?.business_address     ?? "",
      business_reg_url:     existingKyc?.business_reg_url     ?? "",
      proof_of_address_url: existingKyc?.proof_of_address_url ?? "",
    },
  });

  // Scroll first error into view when submit is blocked by validation
  const { errors, isSubmitting } = form.formState;
  useEffect(() => {
    const firstErrorKey = Object.keys(errors)[0];
    if (firstErrorKey) {
      document
        .querySelector(`[name="${firstErrorKey}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [errors]);

  const mutation = trpc.submitKyc.useMutation({
    onSuccess: () => {
      toast({
        title: "KYC Submitted",
        description: "Our team will review your documents shortly.",
      });
      // Redirect to pending page — KycGate will also enforce this
      router.replace("/app/kyc/pending");
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: err.message,
      });
    },
  });
  const authorMutation = trpc.submitAuthorKyc.useMutation({
    onSuccess: () => {
      toast({
        title: "Verification Submitted",
        description: "Our team will review your documents shortly.",
      });
      router.replace("/app/kyc/pending");
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: err.message,
      });
    },
  });

  const onSubmit = (values: FormValues) => {
    const payload = {
      id_document_url: values.id_document_url ?? "",
      id_document_type: (values.id_document_type ?? "passport") as any,
      legal_name: values.legal_name ?? "",
      phone_number: values.phone_number ?? "",
      business_reg_url: values.business_reg_url ?? "",
      business_name: values.business_name ?? "",
      business_address: values.business_address ?? "",
      proof_of_address_url: values.proof_of_address_url ?? "",
    };

    if (mode === "author") {
      authorMutation.mutate({
        author_id: authorId!,
        ...payload,
      });
      return;
    }

    mutation.mutate({
      publisher_id: publisherId!,
      ...payload,
    });
  };

  // Debug: log validation errors on every render
  if (Object.keys(errors).length > 0) {
    console.log("[kyc form] validation errors:", errors);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

        {/* ── Section 1: Government ID ─────────────────────── */}
        {requirements.require_id && (
          <div className="bg-white border-4 border-black p-8 gumroad-shadow space-y-6">
            <h3 className="font-black uppercase italic tracking-tighter text-lg border-b-2 border-black pb-3">
              01. Government ID
            </h3>

            <FormField name="id_document_type" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel className="font-black uppercase text-[10px] tracking-widest">ID Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="booka-input-minimal h-12">
                      <SelectValue placeholder="Select document type..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="border-2 border-black">
                    <SelectItem value="passport">International Passport</SelectItem>
                    <SelectItem value="national_id">National ID Card (NIN)</SelectItem>
                    <SelectItem value="drivers_license">Driver&apos;s Licence</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField name="legal_name" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel className="font-black uppercase text-[10px] tracking-widest">Legal Name (as on ID)</FormLabel>
                <FormControl>
                  <Input {...field} className="booka-input-minimal h-12" placeholder="Full legal name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField name="phone_number" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel className="font-black uppercase text-[10px] tracking-widest">Phone Number</FormLabel>
                <FormControl>
                  <Input {...field} type="tel" className="booka-input-minimal h-12" placeholder="+234 800 000 0000" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FileUploadField
              label="ID Document"
              hint="Clear photo or scan. JPG, PNG, or PDF. Max 10MB."
              fieldName="id_document_url"
              form={form}
            />
          </div>
        )}

        {/* ── Section 2: Business Registration ────────────── */}
        {requirements.require_business_reg && (
          <div className="bg-white border-4 border-black p-8 gumroad-shadow space-y-6">
            <h3 className="font-black uppercase italic tracking-tighter text-lg border-b-2 border-black pb-3">
              02. Business Registration
            </h3>

            <FormField name="business_name" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel className="font-black uppercase text-[10px] tracking-widest">Registered Business Name</FormLabel>
                <FormControl>
                  <Input {...field} className="booka-input-minimal h-12" placeholder="Business name as registered" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField name="business_address" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel className="font-black uppercase text-[10px] tracking-widest">Business Address</FormLabel>
                <FormControl>
                  <Textarea {...field} className="booka-input-minimal min-h-[80px]" placeholder="Full registered business address" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FileUploadField
              label="Business Registration Certificate"
              hint="CAC certificate or equivalent. JPG, PNG, or PDF. Max 10MB."
              fieldName="business_reg_url"
              form={form}
            />
          </div>
        )}

        {/* ── Section 3: Proof of Address ──────────────────── */}
        {requirements.require_proof_of_address && (
          <div className="bg-white border-4 border-black p-8 gumroad-shadow space-y-6">
            <h3 className="font-black uppercase italic tracking-tighter text-lg border-b-2 border-black pb-3">
              03. Proof of Address
            </h3>
            <p className="text-sm opacity-60">
              A recent utility bill, bank statement, or official letter showing
              your business or home address. Must be dated within 3 months.
            </p>

            <FileUploadField
              label="Proof of Address Document"
              hint="Utility bill, bank statement, or official letter. JPG, PNG, or PDF. Max 10MB."
              fieldName="proof_of_address_url"
              form={form}
            />
          </div>
        )}

        {/* ── Submit ───────────────────────────────────────── */}
        <Button
          type="submit"
          disabled={mutation.isPending || authorMutation.isPending || isSubmitting}
          className="w-full booka-button-primary h-16 text-lg flex items-center justify-center gap-2"
        >
          {mutation.isPending || authorMutation.isPending || isSubmitting ? (
            <><Loader2 className="animate-spin size-4" />Submitting...</>
          ) : existingKyc?.status === "rejected" ? (
            mode === "author" ? "Resubmit Verification" : "Resubmit KYC Documents"
          ) : (
            mode === "author" ? "Submit Author Verification" : "Submit for Verification"
          )}
        </Button>

        {/* Show any top-level form error */}
        {(mutation.isError || authorMutation.isError) && (
          <div className="flex items-center gap-2 border-2 border-red-500 bg-red-50 p-4">
            <AlertCircle className="size-4 text-red-500 shrink-0" />
            <p className="text-sm text-red-600 font-bold">{mutation.error?.message || authorMutation.error?.message}</p>
          </div>
        )}
      </form>
    </Form>
  );
}
