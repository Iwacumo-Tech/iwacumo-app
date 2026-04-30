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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useFieldArray, useForm, Control } from "react-hook-form";

import { Checkbox } from "@/components/ui/checkbox";
import {
  DEFAULT_FEZ_SHIPPING_RATES,
  DEFAULT_SHIPPING_PROVIDER_OPTIONS,
  DEFAULT_SPEEDAF_SHIPPING_RATES,
  DEFAULT_BOOK_LIVE_PRICING_ENABLED,
  DEFAULT_BOOK_FEATURE_TOGGLES,
  DEFAULT_BOOK_FLAP_COSTS,
  DEFAULT_BOOK_SIZE_RANGES,
  normalizeBookLivePricingEnabled,
  type BookCustomFieldDefinition,
} from "@/lib/book-config";
import {
  DEFAULT_CURRENCY_SETTINGS,
  DEFAULT_PAYMENT_GATEWAY_SETTINGS,
  CurrencySettings,
  PAYMENT_GATEWAYS,
  PAYMENT_METHODS,
  PaymentGateway,
  PaymentMethod,
} from "@/lib/payment-config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PrintSizeConfig = { cover: number; page: number };

type SettingsFormValues = {
  platform_fee: { type: "percentage" | "flat"; value: number };
  default_markup: number;
  isbn_cost: number;
  currency_settings: CurrencySettings;
  payment_gateway_settings: {
    paystack: {
      enabled: boolean;
      sort_order: number;
      supported_currencies: string[];
      supported_methods: PaymentMethod[];
      display_name?: string;
      mode?: "test" | "live";
    };
    stripe: {
      enabled: boolean;
      sort_order: number;
      supported_currencies: string[];
      supported_methods: PaymentMethod[];
      display_name?: string;
      mode?: "test" | "live";
    };
    paypal: {
      enabled: boolean;
      sort_order: number;
      supported_currencies: string[];
      supported_methods: PaymentMethod[];
      display_name?: string;
      mode?: "test" | "live";
    };
    flutterwave: {
      enabled: boolean;
      sort_order: number;
      supported_currencies: string[];
      supported_methods: PaymentMethod[];
      display_name?: string;
      mode?: "test" | "live";
    };
  };
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
  shipping_provider_options: {
    speedaf: { enabled: boolean };
    fez: { enabled: boolean };
  };
  fez_shipping_rates: {
    kg_cutoff: number;
    G1: { constant: number; variable: number };
    G2: { constant: number; variable: number };
    G3: { constant: number; variable: number };
    G4: { constant: number; variable: number };
    G5: { constant: number; variable: number };
    G6: { constant: number; variable: number };
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
  author_kyc_requirements: {
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
  currency_settings: DEFAULT_CURRENCY_SETTINGS,
  payment_gateway_settings: DEFAULT_PAYMENT_GATEWAY_SETTINGS,
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
  shipping_rates: DEFAULT_SPEEDAF_SHIPPING_RATES,
  shipping_provider_options: DEFAULT_SHIPPING_PROVIDER_OPTIONS,
  fez_shipping_rates: DEFAULT_FEZ_SHIPPING_RATES,
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
  author_kyc_requirements: {
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

const CHECKOUT_CURRENCIES = ["NGN", "USD", "GBP", "EUR"] as const;
const PAYMENT_METHOD_OPTIONS = [
  { value: PAYMENT_METHODS.CARD, label: "Card" },
  { value: PAYMENT_METHODS.BANK_TRANSFER, label: "Bank Transfer" },
  { value: PAYMENT_METHODS.PAYPAL, label: "PayPal" },
  { value: PAYMENT_METHODS.MOBILE_MONEY, label: "Mobile Money" },
] as const;

const SETTINGS_TABS = [
  { value: "commerce", label: "Commerce" },
  { value: "payments", label: "Payments" },
  { value: "shipping", label: "Shipping" },
  { value: "books", label: "Books" },
  { value: "compliance", label: "Compliance" },
] as const;

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

function toOptionalNumberInput(value: string) {
  return value === "" ? undefined : Number(value);
}

type NumericInputProps = Omit<React.ComponentProps<typeof Input>, "type" | "value" | "onChange"> & {
  value: number | null | undefined;
  emptyValue?: undefined | null;
  onValueChange: (value: number | null | undefined) => void;
};

function NumericInput({
  value,
  emptyValue = undefined,
  onValueChange,
  ...props
}: NumericInputProps) {
  const [displayValue, setDisplayValue] = useState(
    value === null || value === undefined ? "" : String(value)
  );
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (isFocused) return;
    const nextValue = value === null || value === undefined ? "" : String(value);
    setDisplayValue((current) => (current === nextValue ? current : nextValue));
  }, [isFocused, value]);

  return (
    <Input
      type="number"
      {...props}
      value={displayValue}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onChange={(e) => {
        const raw = e.target.value;
        setDisplayValue(raw);
        onValueChange(raw === "" ? emptyValue : Number(raw));
      }}
    />
  );
}

function NumberField({ control, name, label, placeholder }: NumberFieldProps) {
  return (
    <FormField
      control={control}
      name={name}
        render={({ field }) => (
        <FormItem>
          <FormLabel className="font-bold text-xs uppercase">{label}</FormLabel>
          <FormControl>
            <NumericInput
              className="input-gumroad"
              placeholder={placeholder}
              value={field.value}
              onValueChange={field.onChange}
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
  const paymentGatewayHealth = ((settings as any)?.payment_gateway_health ?? {}) as Record<string, any>;

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
      currency_settings: (settings as any).currency_settings ?? DEFAULTS.currency_settings,
      payment_gateway_settings: (settings as any).payment_gateway_settings ?? DEFAULTS.payment_gateway_settings,
      printing_costs: settings.printing_costs ?? DEFAULTS.printing_costs,
      shipping_rates: (settings as any).shipping_rates ?? DEFAULTS.shipping_rates,
      shipping_provider_options: (settings as any).shipping_provider_options ?? DEFAULTS.shipping_provider_options,
      fez_shipping_rates: (settings as any).fez_shipping_rates ?? DEFAULTS.fez_shipping_rates,
      book_weights:   (settings as any).book_weights   ?? DEFAULTS.book_weights,
      kyc_requirements: (settings as any).kyc_requirements ?? DEFAULTS.kyc_requirements,
      author_kyc_requirements: (settings as any).author_kyc_requirements ?? DEFAULTS.author_kyc_requirements,
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
    const rateTimestamp = new Date().toISOString();
    const nextCurrencySettings = {
      ...data.currency_settings,
      conversion_rates: Object.fromEntries(
        Object.entries(data.currency_settings.conversion_rates).map(([code, config]) => [
          code,
          {
            ...config,
            updated_at: code === "NGN" ? config.updated_at : rateTimestamp,
          },
        ])
      ),
    };

    updateSettings({ key: "platform_fee",   value: data.platform_fee });
    updateSettings({ key: "default_markup", value: { v: data.default_markup } });
    updateSettings({ key: "isbn_cost",      value: { v: data.isbn_cost } });
    updateSettings({ key: "currency_settings", value: nextCurrencySettings });
    updateSettings({ key: "payment_gateway_settings", value: data.payment_gateway_settings });
    updateSettings({ key: "printing_costs", value: data.printing_costs });
    updateSettings({ key: "shipping_rates", value: data.shipping_rates });
    updateSettings({ key: "shipping_provider_options", value: data.shipping_provider_options });
    updateSettings({ key: "fez_shipping_rates", value: data.fez_shipping_rates });
    updateSettings({ key: "book_weights",   value: data.book_weights });
      updateSettings({ key: "kyc_requirements", value: data.kyc_requirements });
      updateSettings({ key: "author_kyc_requirements", value: data.author_kyc_requirements });
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
            <Tabs defaultValue="commerce" className="space-y-8">
              <div className="overflow-x-auto">
                <TabsList className="h-auto min-w-max rounded-none border-4 border-black bg-white p-2">
                  {SETTINGS_TABS.map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="rounded-none border-2 border-transparent px-4 py-3 text-xs font-black uppercase tracking-widest data-[state=active]:border-black data-[state=active]:bg-black data-[state=active]:text-accent"
                    >
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <TabsContent value="payments" forceMount className="space-y-10 data-[state=inactive]:hidden">

            {/* ── Platform Fee ─────────────────────────────────────────── */}
            {false && (
            <section className="bg-white border-4 border-black gumroad-shadow p-6 space-y-8">
              <h2 className="text-2xl font-black uppercase italic">Fez Shipping Rates</h2>
              <p className="text-xs opacity-50 font-medium -mt-4">
                Fez uses group-based rates. Up to the kg cut-off, the customer pays a fixed amount.
                Above the cut-off, cost = Group Constant + (Group Variable Ã— (Rounded Weight kg âˆ’ Cut-off)).
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <NumberField
                  control={form.control}
                  name="fez_shipping_rates.kg_cutoff"
                  label="KG Cut Off"
                  placeholder="e.g. 3"
                />
              </div>

              <div className="space-y-6">
                <h3 className="text-lg font-black uppercase italic border-b-2 border-black pb-2">Group Rates (â‚¦)</h3>
                {(["G1","G2","G3","G4","G5","G6"] as const).map((group) => (
                  <div key={group} className="grid grid-cols-2 gap-4">
                    <NumberField control={form.control} name={`fez_shipping_rates.${group}.constant`} label={`${group} Constant`} placeholder="e.g. 1500" />
                    <NumberField control={form.control} name={`fez_shipping_rates.${group}.variable`} label={`${group} Variable`} placeholder="e.g. 200" />
                  </div>
                ))}
              </div>
            </section>
            )}

            <section className="bg-white border-4 border-black gumroad-shadow p-6 space-y-8">
              <div>
                <h2 className="text-2xl font-black uppercase italic">Currency Settings</h2>
                <p className="text-xs opacity-50 font-medium mt-2">
                  Orders and reporting stay in the base currency. Set each foreign currency as its NGN equivalent.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="currency_settings.base_currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-xs uppercase">Base Currency</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="input-gumroad">
                            <SelectValue placeholder="Select Base Currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-none border-2 border-black bg-white text-black">
                          {CHECKOUT_CURRENCIES.map((currencyCode) => (
                            <SelectItem key={currencyCode} value={currencyCode}>{currencyCode}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="currency_settings.default_checkout_currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-xs uppercase">Default Checkout Currency</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="input-gumroad">
                            <SelectValue placeholder="Select Default Currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-none border-2 border-black bg-white text-black">
                          {CHECKOUT_CURRENCIES.map((currencyCode) => (
                            <SelectItem key={currencyCode} value={currencyCode}>{currencyCode}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-black uppercase italic border-b-2 border-black pb-2">
                  Supported Checkout Currencies
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {CHECKOUT_CURRENCIES.map((currencyCode) => (
                    <FormField
                      key={currencyCode}
                      control={form.control}
                      name="currency_settings.supported_checkout_currencies"
                      render={({ field }) => {
                        const currentValues = Array.isArray(field.value) ? field.value : [];
                        const checked = currentValues.includes(currencyCode);

                        return (
                          <FormItem className="flex items-center justify-between rounded-none border-2 border-black px-4 py-4">
                            <div>
                              <FormLabel className="font-black text-xs uppercase tracking-widest">
                                {currencyCode}
                              </FormLabel>
                              <p className="text-[10px] font-medium opacity-50 mt-1">
                                Let customers pay in {currencyCode}.
                              </p>
                            </div>
                            <FormControl>
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(nextChecked) => {
                                  const nextValues = nextChecked
                                    ? Array.from(new Set([...currentValues, currencyCode]))
                                    : currentValues.filter((value) => value !== currencyCode);
                                  field.onChange(nextValues);
                                }}
                              />
                            </FormControl>
                          </FormItem>
                        );
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-lg font-black uppercase italic border-b-2 border-black pb-2">
                  Manual Conversion Rates
                </h3>
                {CHECKOUT_CURRENCIES.map((currencyCode) => (
                  <div key={currencyCode} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                      <p className="font-black uppercase text-xs">{currencyCode}</p>
                      <p className="text-[10px] font-medium opacity-50 mt-1">
                        {currencyCode === "NGN" ? "Base currency anchor" : `1 ${currencyCode} = rate in NGN`}
                      </p>
                    </div>
                    <NumberField
                      control={form.control}
                      name={`currency_settings.conversion_rates.${currencyCode}.rate`}
                      label="Rate"
                      placeholder={currencyCode === "NGN" ? "1" : "e.g. 1400"}
                    />
                    <FormField
                      control={form.control}
                      name={`currency_settings.conversion_rates.${currencyCode}.updated_at`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold text-xs uppercase">Last Updated</FormLabel>
                          <FormControl>
                            <Input
                              className="input-gumroad"
                              value={field.value ?? ""}
                              disabled
                              placeholder="Auto-set on save"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-white border-4 border-black gumroad-shadow p-6 space-y-8">
              <div>
                <h2 className="text-2xl font-black uppercase italic">Payment Gateways</h2>
                <p className="text-xs opacity-50 font-medium mt-2">
                  Enable gateways, set their order, and define which currencies and methods they can serve.
                </p>
              </div>

              {(Object.values(PAYMENT_GATEWAYS) as PaymentGateway[]).map((gateway) => {
                const health = paymentGatewayHealth[gateway];

                return (
                  <div key={gateway} className="border-2 border-black p-5 space-y-5">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-black uppercase italic">
                          {form.watch(`payment_gateway_settings.${gateway}.display_name`) || gateway}
                        </h3>
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mt-1">
                          {gateway}
                        </p>
                      </div>
                      <div className="text-[10px] font-black uppercase tracking-widest">
                        <span className="opacity-50 mr-2">Health</span>
                        <span className="border-2 border-black px-2 py-1 inline-block">
                          {health?.status || "disabled"}
                        </span>
                        {health?.missing_credentials?.length > 0 && (
                          <p className="text-[9px] font-medium opacity-60 mt-2 normal-case">
                            Missing: {health.missing_credentials.join(", ")}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name={`payment_gateway_settings.${gateway}.enabled`}
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-none border-2 border-black px-4 py-4">
                            <div>
                              <FormLabel className="font-black text-xs uppercase tracking-widest">
                                Enable Gateway
                              </FormLabel>
                              <p className="text-[10px] font-medium opacity-50 mt-1">
                                Show this gateway when it is configured and supported.
                              </p>
                            </div>
                            <FormControl>
                              <Checkbox checked={!!field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`payment_gateway_settings.${gateway}.display_name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-bold text-xs uppercase">Display Name</FormLabel>
                            <FormControl>
                              <Input className="input-gumroad" {...field} value={field.value ?? ""} />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <NumberField
                        control={form.control}
                        name={`payment_gateway_settings.${gateway}.sort_order`}
                        label="Sort Order"
                        placeholder="e.g. 1"
                      />

                      <FormField
                        control={form.control}
                        name={`payment_gateway_settings.${gateway}.mode`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-bold text-xs uppercase">Mode</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value ?? "test"}>
                              <FormControl>
                                <SelectTrigger className="input-gumroad">
                                  <SelectValue placeholder="Select Mode" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="rounded-none border-2 border-black bg-white text-black">
                                <SelectItem value="test">Test</SelectItem>
                                <SelectItem value="live">Live</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`payment_gateway_settings.${gateway}.supported_currencies`}
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel className="font-bold text-xs uppercase">Supported Currencies</FormLabel>
                            <FormControl>
                              <Input
                                className="input-gumroad"
                                value={Array.isArray(field.value) ? field.value.join(", ") : ""}
                                onChange={(e) => {
                                  const currencies = e.target.value
                                    .split(",")
                                    .map((value) => value.trim().toUpperCase())
                                    .filter(Boolean);
                                  field.onChange(currencies);
                                }}
                                placeholder="NGN, USD, GBP"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-black uppercase text-xs tracking-widest">Supported Methods</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {PAYMENT_METHOD_OPTIONS.map((methodOption) => (
                          <FormField
                            key={`${gateway}-${methodOption.value}`}
                            control={form.control}
                            name={`payment_gateway_settings.${gateway}.supported_methods`}
                            render={({ field }) => {
                              const currentValues = Array.isArray(field.value) ? field.value : [];
                              const checked = currentValues.includes(methodOption.value);

                              return (
                                <FormItem className="flex items-center justify-between rounded-none border-2 border-black px-4 py-4">
                                  <FormLabel className="font-black text-xs uppercase tracking-widest">
                                    {methodOption.label}
                                  </FormLabel>
                                  <FormControl>
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(nextChecked) => {
                                        const nextValues = nextChecked
                                          ? Array.from(new Set([...currentValues, methodOption.value]))
                                          : currentValues.filter((value) => value !== methodOption.value);
                                        field.onChange(nextValues);
                                      }}
                                    />
                                  </FormControl>
                                </FormItem>
                              );
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>

              </TabsContent>

              <TabsContent value="commerce" forceMount className="space-y-10 data-[state=inactive]:hidden">
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

              </TabsContent>

              <TabsContent value="books" forceMount className="space-y-10 data-[state=inactive]:hidden">
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

              </TabsContent>

              <TabsContent value="shipping" forceMount className="space-y-10 data-[state=inactive]:hidden">
            {/* ── Shipping Rates (Speedaf) ─────────────────────────────── */}
            <section className="bg-white border-4 border-black gumroad-shadow p-6 space-y-6">
              <h2 className="text-2xl font-black uppercase italic">Shipping Providers</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {([
                  { key: "speedaf", label: "Enable Speedaf" },
                  { key: "fez", label: "Enable Fez" },
                ] as const).map((provider) => (
                  <FormField
                    key={provider.key}
                    control={form.control}
                    name={`shipping_provider_options.${provider.key}.enabled`}
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-none border-2 border-black px-4 py-4">
                        <div>
                          <FormLabel className="font-black text-xs uppercase tracking-widest">
                            {provider.label}
                          </FormLabel>
                          <p className="text-[10px] font-medium opacity-50 mt-1">
                            Allow this courier to appear as a checkout option.
                          </p>
                        </div>
                        <FormControl>
                          <Checkbox checked={!!field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </section>

            <section className="bg-white border-4 border-black gumroad-shadow p-6 space-y-8">
              <h2 className="text-2xl font-black uppercase italic">Speedaf Shipping Rates</h2>
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
            <section className="bg-white border-4 border-black gumroad-shadow p-6 space-y-8">
              <h2 className="text-2xl font-black uppercase italic">Fez Shipping Rates</h2>
              <p className="text-xs opacity-50 font-medium -mt-4">
                Fez uses group-based rates. Up to the kg cut-off, the customer pays a fixed amount.
                Above the cut-off, cost = Group Constant + (Group Variable Ã— (Rounded Weight kg âˆ’ Cut-off)).
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <NumberField
                  control={form.control}
                  name="fez_shipping_rates.kg_cutoff"
                  label="KG Cut Off"
                  placeholder="e.g. 3"
                />
              </div>

              <div className="space-y-6">
                <h3 className="text-lg font-black uppercase italic border-b-2 border-black pb-2">Group Rates (â‚¦)</h3>
                {(["G1","G2","G3","G4","G5","G6"] as const).map((group) => (
                  <div key={group} className="grid grid-cols-2 gap-4">
                    <NumberField control={form.control} name={`fez_shipping_rates.${group}.constant`} label={`${group} Constant`} placeholder="e.g. 1500" />
                    <NumberField control={form.control} name={`fez_shipping_rates.${group}.variable`} label={`${group} Variable`} placeholder="e.g. 200" />
                  </div>
                ))}
              </div>
            </section>

              </TabsContent>

              <TabsContent value="compliance" forceMount className="space-y-10 data-[state=inactive]:hidden">
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
                <h2 className="text-2xl font-black uppercase italic">Author KYC Requirements</h2>
                <p className="text-xs opacity-50 font-medium mt-1">
                  Choose which documents white-label authors must submit before accessing author tools.
                  Changes take effect immediately for any author who hasn&apos;t been approved yet.
                </p>
              </div>

              <div className="space-y-4">
                {[
                  {
                    field: "author_kyc_requirements.require_id" as const,
                    label: "Government ID",
                    desc: "Passport, National ID, or Driver's Licence",
                  },
                  {
                    field: "author_kyc_requirements.require_business_reg" as const,
                    label: "Business Registration",
                    desc: "CAC certificate or equivalent business registration document",
                  },
                  {
                    field: "author_kyc_requirements.require_proof_of_address" as const,
                    label: "Proof of Address",
                    desc: "Utility bill or bank statement dated within 3 months",
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

              </TabsContent>

              <TabsContent value="books" forceMount className="space-y-10 data-[state=inactive]:hidden">
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

              </TabsContent>
            </Tabs>

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
