"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { deliveryAddressSchema, TDeliveryAddressSchema } from "@/server/dtos";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SHIPPING_ZONES } from "@/lib/constants";

// Build a sorted display list from SHIPPING_ZONES keys.
// Keys are lowercase state names — capitalise for display.
const NIGERIAN_STATES = Object.keys(SHIPPING_ZONES)
  .map((key) => ({
    value: key, // keep lowercase to match zone lookup
    label: key
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" "),
    zone: SHIPPING_ZONES[key],
  }))
  .sort((a, b) => a.label.localeCompare(b.label));

interface DeliveryFormProps {
  onSubmit:       (data: TDeliveryAddressSchema) => void;
  onStateChange?: (state: string) => void; // fires whenever state dropdown changes
  defaultValues?: Partial<TDeliveryAddressSchema>;
  isLoading?:     boolean;
  formId?:        string;
}

export default function DeliveryForm({
  onSubmit,
  onStateChange,
  defaultValues,
  isLoading = false,
  formId = "delivery-form",
}: DeliveryFormProps) {
  const form = useForm<TDeliveryAddressSchema>({
    resolver: zodResolver(deliveryAddressSchema),
    defaultValues: {
      full_name:             defaultValues?.full_name             || "",
      phone_number:          defaultValues?.phone_number          || "",
      email:                 defaultValues?.email                 || "",
      address_line1:         defaultValues?.address_line1         || "",
      address_line2:         defaultValues?.address_line2         || "",
      city:                  defaultValues?.city                  || "",
      state:                 defaultValues?.state                 || "",
      postal_code:           defaultValues?.postal_code           || "",
      country:               defaultValues?.country               || "Nigeria",
      delivery_instructions: defaultValues?.delivery_instructions || "",
    },
  });

  return (
    <Form {...form}>
      <form
        id={formId}
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-5"
      >
        {/* Full Name */}
        <FormField
          control={form.control}
          name="full_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px] font-black uppercase tracking-widest">
                Full Name *
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="Adaeze Okafor"
                  {...field}
                  disabled={isLoading}
                  className="input-gumroad"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Phone + Email */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="phone_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] font-black uppercase tracking-widest">
                  Phone Number *
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="+234 800 000 0000"
                    {...field}
                    disabled={isLoading}
                    className="input-gumroad"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] font-black uppercase tracking-widest">
                  Email (Optional)
                </FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="adaeze@example.com"
                    {...field}
                    disabled={isLoading}
                    className="input-gumroad"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Address lines */}
        <FormField
          control={form.control}
          name="address_line1"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px] font-black uppercase tracking-widest">
                Address Line 1 *
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="Street address, P.O. Box"
                  {...field}
                  disabled={isLoading}
                  className="input-gumroad"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="address_line2"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px] font-black uppercase tracking-widest">
                Address Line 2 (Optional)
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="Apartment, suite, unit, floor…"
                  {...field}
                  disabled={isLoading}
                  className="input-gumroad"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* City + State + Postal */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] font-black uppercase tracking-widest">
                  City *
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enugu"
                    {...field}
                    disabled={isLoading}
                    className="input-gumroad"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* ── State dropdown ─────────────────────────────────── */}
          <FormField
            control={form.control}
            name="state"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] font-black uppercase tracking-widest">
                  State *
                </FormLabel>
                <Select
                  disabled={isLoading}
                  value={field.value}
                  onValueChange={(val) => {
                    field.onChange(val);
                    onStateChange?.(val); // bubble up for live shipping calc
                  }}
                >
                  <FormControl>
                    <SelectTrigger className="input-gumroad h-10">
                      <SelectValue placeholder="Select state…" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-white text-black border-[1.5px] border-black rounded-none max-h-60">
                    {NIGERIAN_STATES.map(({ value, label, zone }) => (
                      <SelectItem key={value} value={value}>
                        <span>{label}</span>
                        <span className="ml-2 text-[9px] font-black uppercase tracking-widest opacity-40">
                          {zone}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="postal_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] font-black uppercase tracking-widest">
                  Postal Code *
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="400001"
                    {...field}
                    disabled={isLoading}
                    className="input-gumroad"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Country — locked to Nigeria for now */}
        <FormField
          control={form.control}
          name="country"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px] font-black uppercase tracking-widest">
                Country *
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  disabled
                  className="input-gumroad bg-black/[0.03] cursor-not-allowed"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Delivery instructions */}
        <FormField
          control={form.control}
          name="delivery_instructions"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px] font-black uppercase tracking-widest">
                Delivery Instructions (Optional)
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Leave at gate, call on arrival…"
                  {...field}
                  disabled={isLoading}
                  rows={3}
                  className="input-gumroad resize-none"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}