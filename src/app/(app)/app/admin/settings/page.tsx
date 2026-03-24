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
import { useForm, Control } from "react-hook-form";

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

            {/* ── Save ─────────────────────────────────────────────────── */}
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