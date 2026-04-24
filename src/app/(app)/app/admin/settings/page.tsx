"use client";

import { trpc } from "@/app/_providers/trpc-provider";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useFieldArray, useForm, Control } from "react-hook-form";

import { Checkbox } from "@/components/ui/checkbox";
import {
  DEFAULT_BOOK_LIVE_PRICING_ENABLED,
  DEFAULT_BOOK_FEATURE_TOGGLES,
  DEFAULT_BOOK_FLAP_COSTS,
  DEFAULT_BOOK_SIZE_RANGES,
  normalizeBookLivePricingEnabled,
  type BookCustomFieldDefinition,
} from "@/lib/book-config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PrintSizeConfig = { cover: number; page: number };

type SettingsFormValues = {
  platform_fee: { type: "percentage" | "flat"; value: number };
  default_markup: number;
  isbn_cost: number;
  printing_costs: {
    paperback: { A6: PrintSizeConfig; A5: PrintSizeConfig; A4: PrintSizeConfig };
    hardcover: { A6: PrintSizeConfig; A5: PrintSizeConfig; A4: PrintSizeConfig };
  };
  shipping_rates: {
    Z1: { constant: number; variable: number };
    Z2: { constant: number; variable: number };
    Z3: { constant: number; variable: number };
    Z4: { constant: number; variable: number };
  };
  book_weights: {
    paperback: { A6: { cover: number; page: number }; A5: { cover: number; page: number }; A4: { cover: number; page: number } };
    hardcover: { A6: { cover: number; page: number }; A5: { cover: number; page: number }; A4: { cover: number; page: number } };
  };
  kyc_requirements: {
    require_id:               boolean;
    require_business_reg:     boolean;
    require_proof_of_address: boolean;
  };
  book_feature_toggles: {
    subtitle: boolean;
    language: boolean;
    isbn: boolean;
    publication_date: boolean;
    paperback: boolean;
    hardcover: boolean;
    flap: boolean;
    physical_printing: boolean;
  };
  book_size_ranges: {
    A6: { width_min: number; width_max: number; height_min: number; height_max: number };
    A5: { width_min: number; width_max: number; height_min: number; height_max: number };
    A4: { width_min: number; width_max: number; height_min: number; height_max: number };
  };
  book_flap_costs: {
    single: { A6: number; A5: number; A4: number };
    double: { A6: number; A5: number; A4: number };
  };
  book_live_pricing_enabled: boolean;
  book_custom_fields: BookCustomFieldDefinition[];
};

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULTS: SettingsFormValues = {
  platform_fee: { type: "percentage", value: 30 },
  default_markup: 20,
  isbn_cost: 0,
  printing_costs: {
    paperback: {
      A6: { cover: 1500, page: 5 },
      A5: { cover: 2000, page: 10 },
      A4: { cover: 3000, page: 15 },
    },
    hardcover: {
      A6: { cover: 2500, page: 5 },
      A5: { cover: 3500, page: 10 },
      A4: { cover: 5000, page: 15 },
    },
  },
  shipping_rates: {
    Z1: { constant: 1500, variable: 200 },
    Z2: { constant: 2000, variable: 250 },
    Z3: { constant: 1200, variable: 180 },
    Z4: { constant: 1000, variable: 150 },
  },
  book_weights: {
    paperback: {
      A6: { cover: 50, page: 3 },
      A5: { cover: 70, page: 4 },
      A4: { cover: 90, page: 6 },
    },
    hardcover: {
      A6: { cover: 120, page: 3 },
      A5: { cover: 160, page: 4 },
      A4: { cover: 200, page: 6 },
    },
  },
  kyc_requirements: {
    require_id:               true,
    require_business_reg:     true,
    require_proof_of_address: true,
  },
  book_feature_toggles: DEFAULT_BOOK_FEATURE_TOGGLES,
  book_size_ranges: DEFAULT_BOOK_SIZE_RANGES,
  book_flap_costs: DEFAULT_BOOK_FLAP_COSTS,
  book_live_pricing_enabled: DEFAULT_BOOK_LIVE_PRICING_ENABLED,
  book_custom_fields: [],
};

// ---------------------------------------------------------------------------
// Sub-components defined OUTSIDE the page component.
//
// This is the fix for the "input loses focus after one character" bug.
// Defining components inside a parent component body causes React to treat
// them as a new component type on every render, forcing unmount/remount of
// the input element (and therefore loss of focus) on every keystroke.
// ---------------------------------------------------------------------------

type NumberFieldProps = {
  control: Control<SettingsFormValues>;
  name: any;
  label: string;
  placeholder?: string;
};

function NumberField({ control, name, label, placeholder }: NumberFieldProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="font-bold text-xs uppercase">{label}</FormLabel>
          <FormControl>
            <Input
              type="number"
              className="input-gumroad"
              placeholder={placeholder}
              value={field.value ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                field.onChange(val === "" ? 0 : Number(val));
              }}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

type SizePairProps = {
  control: Control<SettingsFormValues>;
  type: "paperback" | "hardcover";
  size: "A6" | "A5" | "A4";
};

function SizePairInputs({ control, type, size }: SizePairProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <NumberField
        control={control}
        name={`printing_costs.${type}.${size}.cover`}
        label={`${size} Cover (₦)`}
        placeholder="Cover cost"
      />
      <NumberField
        control={control}
        name={`printing_costs.${type}.${size}.page`}
        label={`${size} Per Page (₦)`}
        placeholder="Per page"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper: safely read a primitive number from a potentially nested object.
//
// The previous version of this page wrapped scalar values as { value: N }
// before saving, and that wrapper itself got wrapped on each subsequent save,
// producing deep nesting like { value: { value: { value: 9 } } }.
// This unwraps however many levels exist and returns the inner number.
// ---------------------------------------------------------------------------

function flatNumber(raw: any, fallback: number): number {
  if (raw === null || raw === undefined) return fallback;
  if (typeof raw === "number") return raw;
  let val = raw;
  while (typeof val === "object" && val !== null && "value" in val) {
    val = val.value;
  }
  // Also handle the { v: N } shape used going forward
  if (typeof val === "object" && val !== null && "v" in val) {
    val = (val as any).v;
  }
  return typeof val === "number" ? val : fallback;
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function SystemSettingsPage() {
  const { toast } = useToast();

  const { data: settings, isLoading } = trpc.getSystemSettings.useQuery();

  const { mutate: updateSettings, isPending } =
    trpc.updateSystemSettings.useMutation({
      onSuccess: () => {
        toast({ title: "Saved", description: "Settings updated successfully." });
      },
      onError: (err) =>
        toast({
          variant: "destructive",
          title: "Error",
          description: err.message,
        }),
    });

  const form = useForm<SettingsFormValues>({ defaultValues: DEFAULTS });
  const { fields: customFields, append, remove } = useFieldArray({
    control: form.control,
    name: "book_custom_fields",
  });

  // Hydrate the form once the server response arrives.
  // flatNumber handles both clean data and the previously-nested broken data.
  useEffect(() => {
    if (!settings) return;
    form.reset({
      platform_fee: {
        type: settings.platform_fee?.type ?? "percentage",
        value: flatNumber(settings.platform_fee?.value, 30),
      },
      default_markup: flatNumber((settings as any).default_markup, 20),
      isbn_cost: flatNumber((settings as any).isbn_cost, 0),
      printing_costs: settings.printing_costs ?? DEFAULTS.printing_costs,
      shipping_rates: (settings as any).shipping_rates ?? DEFAULTS.shipping_rates,
      book_weights:   (settings as any).book_weights   ?? DEFAULTS.book_weights,
      kyc_requirements: (settings as any).kyc_requirements ?? DEFAULTS.kyc_requirements,
      book_feature_toggles: (settings as any).book_feature_toggles ?? DEFAULTS.book_feature_toggles,
      book_size_ranges: (settings as any).book_size_ranges ?? DEFAULTS.book_size_ranges,
      book_flap_costs: (settings as any).book_flap_costs ?? DEFAULTS.book_flap_costs,
      book_live_pricing_enabled: normalizeBookLivePricingEnabled((settings as any).book_live_pricing_enabled),
      book_custom_fields: (settings as any).book_custom_fields ?? DEFAULTS.book_custom_fields,
    });
  }, [settings, form]);

  // Save each top-level key separately to match { key, value } API shape.
  // Scalars are stored as { v: N } — a flat single-key object — so they satisfy
  // the Record<string, any> requirement without risk of further nesting.
  const onSubmit = (data: SettingsFormValues) => {
    updateSettings({ key: "platform_fee",   value: data.platform_fee });
    updateSettings({ key: "default_markup", value: { v: data.default_markup } });
    updateSettings({ key: "isbn_cost",      value: { v: data.isbn_cost } });
    updateSettings({ key: "printing_costs", value: data.printing_costs });
    updateSettings({ key: "shipping_rates", value: data.shipping_rates });
    updateSettings({ key: "book_weights",   value: data.book_weights });
    updateSettings({ key: "kyc_requirements", value: data.kyc_requirements });
    updateSettings({ key: "book_feature_toggles", value: data.book_feature_toggles });
    updateSettings({ key: "book_size_ranges", value: data.book_size_ranges });
    updateSettings({ key: "book_flap_costs", value: data.book_flap_costs });
    updateSettings({ key: "book_live_pricing_enabled", value: data.book_live_pricing_enabled });
    updateSettings({ key: "book_custom_fields", value: data.book_custom_fields });
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b-4 border-black pb-8">
        <div>
          <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter">
            System Settings<span className="text-accent">.</span>
          </h1>
          <p className="font-bold text-xs uppercase opacity-40 tracking-widest mt-2 flex items-center gap-2">
            <CheckCircle2 size={14} />
            Configure platform-wide pricing and costs
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-3 p-8 text-sm font-bold uppercase tracking-widest opacity-40">
          <Loader2 size={16} className="animate-spin" />
          Loading settings…
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">

            {/* ── Platform Fee ─────────────────────────────────────────── */}
            <section className="bg-white border-4 border-black gumroad-shadow p-6 space-y-6">
              <h2 className="text-2xl font-black uppercase italic">Platform Fee</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="platform_fee.type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-xs uppercase">Fee Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="input-gumroad">
                            <SelectValue placeholder="Select Type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-none border-2 border-black bg-white text-black">
                          <SelectItem value="percentage">Percentage</SelectItem>
                          <SelectItem value="flat">Flat Rate</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <NumberField
                  control={form.control}
                  name="platform_fee.value"
                  label="Fee Value"
                  placeholder="e.g. 30"
                />
              </div>
              <p className="text-xs opacity-50 font-medium">
                Applied on top of print cost for physical books, and on the lister's set price for ebooks.
              </p>
            </section>

            {/* ── Markup & ISBN ────────────────────────────────────────── */}
            <section className="bg-white border-4 border-black gumroad-shadow p-6 space-y-6">
              <h2 className="text-2xl font-black uppercase italic">Markup &amp; ISBN</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <NumberField
                  control={form.control}
                  name="default_markup"
                  label="Default Markup (%)"
                  placeholder="e.g. 20"
                />
                <NumberField
                  control={form.control}
                  name="isbn_cost"
                  label="ISBN Assignment Fee (₦)"
                  placeholder="e.g. 5000"
                />
              </div>
              <p className="text-xs opacity-50 font-medium">
                Default markup is the author/publisher's base margin applied after print cost.
                ISBN fee is charged when the platform assigns an ISBN on behalf of the lister.
              </p>
            </section>

            {/* ── Printing Costs ───────────────────────────────────────── */}
            <section className="bg-white border-4 border-black gumroad-shadow p-6 space-y-8">
              <h2 className="text-2xl font-black uppercase italic">Printing Costs (₦)</h2>
              <p className="text-xs opacity-50 font-medium -mt-4">
                Formula: Print Cost = Cover Finish Cost + (Pages × Per Page Cost).
                Paper type (cream vs white) does not affect cost.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <h3 className="text-lg font-black uppercase italic border-b-2 border-black pb-2">
                    Paperback
                  </h3>
                  <div className="space-y-4">
                    <SizePairInputs control={form.control} type="paperback" size="A6" />
                    <SizePairInputs control={form.control} type="paperback" size="A5" />
                    <SizePairInputs control={form.control} type="paperback" size="A4" />
                  </div>
                </div>
                <div className="space-y-6">
                  <h3 className="text-lg font-black uppercase italic border-b-2 border-black pb-2">
                    Hardcover
                  </h3>
                  <div className="space-y-4">
                    <SizePairInputs control={form.control} type="hardcover" size="A6" />
                    <SizePairInputs control={form.control} type="hardcover" size="A5" />
                    <SizePairInputs control={form.control} type="hardcover" size="A4" />
                  </div>
                </div>
              </div>
            </section>

            {/* ── Shipping Rates (Speedaf) ─────────────────────────────── */}
            <section className="bg-white border-4 border-black gumroad-shadow p-6 space-y-8">
              <h2 className="text-2xl font-black uppercase italic">Shipping Rates</h2>
              <p className="text-xs opacity-50 font-medium -mt-4">
                Speedaf zone-based rates. Cost = Zone Constant + (Zone Variable × (Weight kg − 1)).
                Weights are computed from book size/page count using the weight constants below.
              </p>

              {/* Zone rates */}
              <div className="space-y-6">
                <h3 className="text-lg font-black uppercase italic border-b-2 border-black pb-2">Zone Rates (₦)</h3>
                {(["Z1","Z2","Z3","Z4"] as const).map((zone) => (
                  <div key={zone} className="grid grid-cols-2 gap-4">
                    <NumberField control={form.control} name={`shipping_rates.${zone}.constant`} label={`${zone} Constant`} placeholder="e.g. 1500" />
                    <NumberField control={form.control} name={`shipping_rates.${zone}.variable`} label={`${zone} Variable`} placeholder="e.g. 200" />
                  </div>
                ))}
              </div>

              {/* Book weight constants */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <h3 className="text-lg font-black uppercase italic border-b-2 border-black pb-2">Paperback Weights (g)</h3>
                  {(["A6","A5","A4"] as const).map((size) => (
                    <div key={size} className="grid grid-cols-2 gap-4">
                      <NumberField control={form.control} name={`book_weights.paperback.${size}.cover`} label={`${size} Cover (g)`} placeholder="e.g. 50" />
                      <NumberField control={form.control} name={`book_weights.paperback.${size}.page`}  label={`${size} Per Page (g)`} placeholder="e.g. 5" />
                    </div>
                  ))}
                </div>
                <div className="space-y-4">
                  <h3 className="text-lg font-black uppercase italic border-b-2 border-black pb-2">Hardcover Weights (g)</h3>
                  {(["A6","A5","A4"] as const).map((size) => (
                    <div key={size} className="grid grid-cols-2 gap-4">
                      <NumberField control={form.control} name={`book_weights.hardcover.${size}.cover`} label={`${size} Cover (g)`} placeholder="e.g. 80" />
                      <NumberField control={form.control} name={`book_weights.hardcover.${size}.page`}  label={`${size} Per Page (g)`} placeholder="e.g. 5" />
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* ── KYC Requirements ─────────────────────────────────────── */}
            <section className="bg-white border-4 border-black gumroad-shadow p-6 space-y-6">
              <div>
                <h2 className="text-2xl font-black uppercase italic">Publisher KYC Requirements</h2>
                <p className="text-xs opacity-50 font-medium mt-1">
                  Choose which documents publishers must submit before accessing the platform.
                  Changes take effect immediately for any publisher who hasn&apos;t been approved yet.
                </p>
              </div>
            
              <div className="space-y-4">
                {[
                  {
                    field: "kyc_requirements.require_id" as const,
                    label: "Government ID",
                    desc:  "Passport, National ID, or Driver's Licence",
                  },
                  {
                    field: "kyc_requirements.require_business_reg" as const,
                    label: "Business Registration",
                    desc:  "CAC certificate or equivalent business registration document",
                  },
                  {
                    field: "kyc_requirements.require_proof_of_address" as const,
                    label: "Proof of Address",
                    desc:  "Utility bill or bank statement dated within 3 months",
                  },
                ].map(({ field, label, desc }) => (
                  <FormField
                    key={field}
                    control={form.control}
                    name={field}
                    render={({ field: f }) => (
                      <FormItem className="flex items-start gap-4 space-y-0 border-2 border-black p-4">
                        <FormControl>
                          <Checkbox
                            checked={f.value as boolean}
                            onCheckedChange={f.onChange}
                            className="mt-0.5 border-2 border-black data-[state=checked]:bg-black data-[state=checked]:text-accent"
                          />
                        </FormControl>
                        <div>
                          <FormLabel className="font-black uppercase text-[11px] tracking-widest cursor-pointer">
                            {label}
                          </FormLabel>
                          <p className="text-xs opacity-50 mt-0.5">{desc}</p>
                        </div>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </section>

            {/* ── Save ─────────────────────────────────────────────────── */}
            <section className="bg-white border-4 border-black gumroad-shadow p-6 space-y-6">
              <div>
                <h2 className="text-2xl font-black uppercase italic">Book Feature Toggles</h2>
                <p className="text-xs opacity-50 font-medium mt-1">
                  Control which standard book options appear in author and publisher book setup.
                </p>
              </div>

              <div className="space-y-4">
                {[
                  { field: "book_feature_toggles.subtitle" as const, label: "Subtitle" },
                  { field: "book_feature_toggles.language" as const, label: "Language" },
                  { field: "book_feature_toggles.isbn" as const, label: "ISBN" },
                  { field: "book_feature_toggles.publication_date" as const, label: "Publication Date" },
                  { field: "book_feature_toggles.paperback" as const, label: "Paperback" },
                  { field: "book_feature_toggles.hardcover" as const, label: "Hardcover" },
                  { field: "book_feature_toggles.flap" as const, label: "Flaps" },
                  { field: "book_feature_toggles.physical_printing" as const, label: "Physical Printing" },
                ].map(({ field, label }) => (
                  <FormField
                    key={field}
                    control={form.control}
                    name={field}
                    render={({ field: f }) => (
                      <FormItem className="flex items-start gap-4 space-y-0 border-2 border-black p-4">
                        <FormControl>
                          <Checkbox
                            checked={f.value as boolean}
                            onCheckedChange={f.onChange}
                            className="mt-0.5 border-2 border-black data-[state=checked]:bg-black data-[state=checked]:text-accent"
                          />
                        </FormControl>
                        <FormLabel className="font-black uppercase text-[11px] tracking-widest cursor-pointer">
                          {label}
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </section>

            <section className="bg-white border-4 border-black gumroad-shadow p-6 space-y-8">
              <div>
                <h2 className="text-2xl font-black uppercase italic">Book Size Ranges</h2>
                <p className="text-xs opacity-50 font-medium mt-1">
                  Match custom width and height in inches to the nearest supported A6, A5, or A4 bucket.
                </p>
              </div>
              {(["A6", "A5", "A4"] as const).map((size) => (
                <div key={size} className="space-y-4">
                  <h3 className="text-lg font-black uppercase italic border-b-2 border-black pb-2">{size}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <NumberField control={form.control} name={`book_size_ranges.${size}.width_min`} label={`${size} Width Min`} />
                    <NumberField control={form.control} name={`book_size_ranges.${size}.width_max`} label={`${size} Width Max`} />
                    <NumberField control={form.control} name={`book_size_ranges.${size}.height_min`} label={`${size} Height Min`} />
                    <NumberField control={form.control} name={`book_size_ranges.${size}.height_max`} label={`${size} Height Max`} />
                  </div>
                </div>
              ))}
            </section>

            <section className="bg-white border-4 border-black gumroad-shadow p-6 space-y-8">
              <div>
                <h2 className="text-2xl font-black uppercase italic">Flap Costs</h2>
                <p className="text-xs opacity-50 font-medium mt-1">
                  Additional constants applied to physical print cost before markup.
                </p>
              </div>
              {(["single", "double"] as const).map((flapType) => (
                <div key={flapType} className="space-y-4">
                  <h3 className="text-lg font-black uppercase italic border-b-2 border-black pb-2">
                    {flapType === "single" ? "Single Flap" : "Double Flap"}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <NumberField control={form.control} name={`book_flap_costs.${flapType}.A6`} label="A6" />
                    <NumberField control={form.control} name={`book_flap_costs.${flapType}.A5`} label="A5" />
                    <NumberField control={form.control} name={`book_flap_costs.${flapType}.A4`} label="A4" />
                  </div>
                </div>
              ))}
            </section>

            <section className="bg-white border-4 border-black gumroad-shadow p-6 space-y-6">
              <div>
                <h2 className="text-2xl font-black uppercase italic">Physical Price Mode</h2>
                <p className="text-xs opacity-50 font-medium mt-1">
                  When live pricing is on, physical book prices update automatically when print settings change.
                </p>
              </div>

              <FormField
                control={form.control}
                name="book_live_pricing_enabled"
                render={({ field }) => (
                  <FormItem className="flex items-start gap-4 space-y-0 border-2 border-black p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="mt-0.5 border-2 border-black data-[state=checked]:bg-black data-[state=checked]:text-accent"
                      />
                    </FormControl>
                    <div className="space-y-1">
                      <FormLabel className="font-black uppercase text-[11px] tracking-widest cursor-pointer">
                        Enable Live Physical Pricing
                      </FormLabel>
                      <p className="text-xs opacity-60">
                        Existing paperback and hardcover book prices will follow the latest admin print settings.
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            </section>

            <section className="bg-white border-4 border-black gumroad-shadow p-6 space-y-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black uppercase italic">Book Custom Fields</h2>
                  <p className="text-xs opacity-50 font-medium mt-1">
                    Add extra metadata fields that appear automatically on book setup and detail pages.
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={() => append({
                    key: `field_${Date.now()}`,
                    label: "New Field",
                    field_type: "text",
                    placeholder: "",
                    help_text: "",
                    options: [],
                    required: false,
                    enabled: true,
                    show_on_public_page: false,
                    show_on_creator_view: true,
                    show_on_admin_view: true,
                    section: "Additional Information",
                    sort_order: customFields.length,
                  })}
                  className="rounded-none border-2 border-black bg-black text-white"
                >
                  Add Field
                </Button>
              </div>

              <div className="space-y-6">
                {customFields.map((fieldItem, index) => (
                  <div key={fieldItem.id} className="border-2 border-black p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField control={form.control} name={`book_custom_fields.${index}.key`} render={({ field }) => (
                        <FormItem><FormLabel className="font-bold text-xs uppercase">Key</FormLabel><FormControl><Input className="input-gumroad" {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name={`book_custom_fields.${index}.label`} render={({ field }) => (
                        <FormItem><FormLabel className="font-bold text-xs uppercase">Label</FormLabel><FormControl><Input className="input-gumroad" {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name={`book_custom_fields.${index}.field_type`} render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold text-xs uppercase">Field Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger className="input-gumroad"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent className="rounded-none border-2 border-black bg-white text-black">
                              <SelectItem value="text">Text</SelectItem>
                              <SelectItem value="textarea">Textarea</SelectItem>
                              <SelectItem value="number">Number</SelectItem>
                              <SelectItem value="date">Date</SelectItem>
                              <SelectItem value="select">Select</SelectItem>
                              <SelectItem value="checkbox">Checkbox</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name={`book_custom_fields.${index}.placeholder`} render={({ field }) => (
                        <FormItem><FormLabel className="font-bold text-xs uppercase">Placeholder</FormLabel><FormControl><Input className="input-gumroad" {...field} value={field.value ?? ""} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name={`book_custom_fields.${index}.help_text`} render={({ field }) => (
                        <FormItem><FormLabel className="font-bold text-xs uppercase">Help Text</FormLabel><FormControl><Input className="input-gumroad" {...field} value={field.value ?? ""} /></FormControl></FormItem>
                      )} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { name: `book_custom_fields.${index}.enabled` as const, label: "Enabled" },
                        { name: `book_custom_fields.${index}.required` as const, label: "Required" },
                        { name: `book_custom_fields.${index}.show_on_public_page` as const, label: "Public" },
                        { name: `book_custom_fields.${index}.show_on_creator_view` as const, label: "Creator" },
                        { name: `book_custom_fields.${index}.show_on_admin_view` as const, label: "Admin" },
                      ].map((checkboxField) => (
                        <FormField
                          key={checkboxField.name}
                          control={form.control}
                          name={checkboxField.name}
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-2 space-y-0">
                              <FormControl><Checkbox checked={!!field.value} onCheckedChange={field.onChange} /></FormControl>
                              <FormLabel className="font-bold text-xs uppercase">{checkboxField.label}</FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>

                    <FormField control={form.control} name={`book_custom_fields.${index}.options`} render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-xs uppercase">Select Options</FormLabel>
                        <FormControl>
                          <Input
                            className="input-gumroad"
                            value={Array.isArray(field.value) ? field.value.map((option: any) => option?.label ?? option?.value ?? "").join(", ") : ""}
                            onChange={(e) => {
                              const options = e.target.value.split(",").map((value) => value.trim()).filter(Boolean).map((value) => ({ label: value, value }));
                              field.onChange(options);
                            }}
                          />
                        </FormControl>
                      </FormItem>
                    )} />

                    <div className="flex justify-end">
                      <Button type="button" variant="destructive" onClick={() => remove(index)} className="rounded-none">
                        Remove Field
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={isPending}
                className="w-full md:w-auto bg-black text-white font-black uppercase italic tracking-widest h-14 px-10 rounded-none border-2 border-black gumroad-shadow hover:translate-x-[2px] transition-all disabled:opacity-50"
              >
                {isPending ? <Loader2 size={16} className="animate-spin" /> : "Save Settings"}
              </Button>
            </div>

          </form>
        </Form>
      )}
    </div>
  );
}
