"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/app/_providers/trpc-provider";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Loader2, ExternalLink, Copy, Check, Lock, Upload, Palette, Globe, Type, LayoutTemplate, Share2, Eye, AlertCircle } from "lucide-react";

import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch }   from "@/components/ui/switch";
import { Label }    from "@/components/ui/label";
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

import { uploadImage } from "@/lib/server";
import {
  STOREFRONT_CARD_STYLES,
  STOREFRONT_HEADING_STYLES,
  STOREFRONT_NAV_STYLES,
  STOREFRONT_PAGE_SURFACES,
  STOREFRONT_THEME_PRESETS,
} from "@/lib/storefront-theme";

// ─── Form schema (mirrors server schema) ─────────────────────────────────────

const formSchema = z.object({
  logo_url:        z.string().url("Must be a valid URL").nullable().optional().or(z.literal("")),
  contact_email:   z.string().email("Invalid email").nullable().optional().or(z.literal("")),
  bio:             z.string().max(500).nullable().optional(),
  name:            z.string().min(1).max(80).optional(),
  tagline:         z.string().max(120).nullable().optional(),
  brand_color:     z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a hex color like #FFD700").nullable().optional().or(z.literal("")),
  secondary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a hex color").nullable().optional().or(z.literal("")),
  font_family:     z.enum(["inter", "playfair", "space-grotesk", "lora"]).nullable().optional(),
  custom_domain:   z.string().nullable().optional(),
  twitter:         z.string().url().nullable().optional().or(z.literal("")),
  instagram:       z.string().url().nullable().optional().or(z.literal("")),
  facebook:        z.string().url().nullable().optional().or(z.literal("")),
  website:         z.string().url().nullable().optional().or(z.literal("")),
  themePreset:     z.enum(["editorial", "modern", "minimal", "bold"]).optional(),
  pageSurface:     z.enum(["paper", "studio", "contrast"]).optional(),
  navStyle:        z.enum(["solid", "framed", "floating"]).optional(),
  cardStyle:       z.enum(["shadow", "bordered", "soft"]).optional(),
  headingStyle:    z.enum(["italic", "serif", "caps"]).optional(),
  heroLayout:      z.enum(["split", "full", "minimal"]).optional(),
  accentStyle:     z.enum(["bold", "outline", "soft"]).optional(),
  showCategories:  z.boolean().optional(),
  showNewArrivals: z.boolean().optional(),
  showFeatured:    z.boolean().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const FONT_FAMILY_OPTIONS = ["inter", "playfair", "space-grotesk", "lora"] as const;
const HERO_LAYOUT_OPTIONS = ["split", "full", "minimal"] as const;
const ACCENT_STYLE_OPTIONS = ["bold", "outline", "soft"] as const;
const THEME_PRESET_OPTIONS = ["editorial", "modern", "minimal", "bold"] as const;
const PAGE_SURFACE_OPTIONS = ["paper", "studio", "contrast"] as const;
const NAV_STYLE_OPTIONS = ["solid", "framed", "floating"] as const;
const CARD_STYLE_OPTIONS = ["shadow", "bordered", "soft"] as const;
const HEADING_STYLE_OPTIONS = ["italic", "serif", "caps"] as const;

function normalizeStoreEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return typeof value === "string" && allowed.includes(value as T)
    ? value as T
    : fallback;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-3 mb-6 pb-3 border-b-[1.5px] border-black">
      <div className="w-8 h-8 bg-black flex items-center justify-center">
        <Icon size={14} className="text-accent" />
      </div>
      <span className="text-[10px] font-black uppercase tracking-[0.25em]">{label}</span>
    </div>
  );
}

function WhiteLabelBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent text-black text-[9px] font-black uppercase tracking-widest rounded-sm border border-black">
      ✦ White Label
    </span>
  );
}

function LockedSection({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/80 backdrop-blur-[2px] border-[1.5px] border-dashed border-black/30 rounded-sm">
        <Lock size={18} className="opacity-30" />
        <p className="text-[10px] font-black uppercase tracking-widest opacity-40 text-center px-4">
          White-label feature — contact support to upgrade
        </p>
      </div>
      <div className="opacity-30 pointer-events-none select-none">{children}</div>
    </div>
  );
}

function ColorSwatch({ color }: { color: string }) {
  if (!color || !/^#[0-9A-Fa-f]{6}$/.test(color)) return null;
  return (
    <span
      className="inline-block w-5 h-5 rounded-sm border border-black/20 shrink-0"
      style={{ background: color }}
    />
  );
}

// ─── Store link copy button ───────────────────────────────────────────────────

function StoreLinkCopy({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const url = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://booka.africa"}/${slug}`;

  const copy = useCallback(() => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [url]);

  return (
    <div className="flex items-stretch gap-0 border-[1.5px] border-black gumroad-shadow-sm">
      <div className="flex-1 px-4 py-3 bg-white font-mono text-xs truncate flex items-center">
        {url}
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="px-3 flex items-center border-l-[1.5px] border-black hover:bg-black hover:text-white transition-colors"
        title="Open store"
      >
        <ExternalLink size={14} />
      </a>
      <button
        type="button"
        onClick={copy}
        className="px-3 flex items-center border-l-[1.5px] border-black hover:bg-accent transition-colors"
        title="Copy link"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </div>
  );
}

// ─── Image upload field ───────────────────────────────────────────────────────

function LogoUploadField({
  value,
  onChange,
}: {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // You can choose to use trpc or the uploadImage utility here.
  // Using the uploadImage utility for consistency with your KYC form:
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. File Size Check (e.g., 2MB for logos)
    if (file.size > 2 * 1024 * 1024) {
      setUploadError("Logo too large. Max 2MB.");
      return;
    }

    setUploading(true);
    setUploadError("");

      try {
        // 2. Upload using the utility
        const url = await uploadImage(file, {
          category: "image",
          purpose: "store-logos",
        });
        onChange(url);
      } catch (err) {
        setUploadError("Upload failed. Please try again.");
      console.error("[logo upload]", err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={handleFile}
        disabled={uploading}
      />

      {value ? (
        <div className="flex items-center gap-4 border-[1.5px] border-black p-3 bg-white gumroad-shadow-sm w-fit">
          <div className="h-14 w-14 border-[1.5px] border-black/10 flex items-center justify-center bg-gray-50">
            <img src={value} alt="Logo preview" className="h-12 w-12 object-contain" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-green-600">
              Logo Active
            </span>
            <button
              type="button"
              onClick={() => {
                onChange(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              className="text-[9px] font-black uppercase underline hover:text-red-500 text-left"
            >
              Remove Logo
            </button>
          </div>
        </div>
      ) : (
        <div className={uploadError ? "border-red-500" : ""}>
          <Button
            type="button"
            variant="outline"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="h-14 gap-2 rounded-none border-[1.5px] border-black font-black uppercase text-[10px] tracking-[0.2em] hover:bg-black hover:text-white transition-all gumroad-shadow-sm"
          >
            {uploading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <Upload size={14} />
                Upload Store Logo
              </>
            )}
          </Button>
        </div>
      )}

      {uploadError && (
        <div className="flex items-center gap-1.5 mt-1">
          <AlertCircle className="size-3 text-red-500" />
          <p className="text-[10px] text-red-600 font-bold uppercase tracking-tight">
            {uploadError}
          </p>
        </div>
      )}

      {!value && !uploadError && (
        <p className="text-[10px] text-gray-400 font-medium">
          PNG, JPG, SVG or WebP. Square aspect ratio recommended.
        </p>
      )}
    </div>
  );
}


// ─── Main page ────────────────────────────────────────────────────────────────

export default function PublisherStoreSettingsPage() {
  const { data: session } = useSession();
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.getPublisherStoreSettings.useQuery(undefined, {
    enabled: !!session?.user?.id,
  });

  const update = trpc.updatePublisherStoreSettings.useMutation({
    onSuccess: () => {
      toast.success("Store settings saved.");
      utils.getPublisherStoreSettings.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const isWhiteLabel = data?.publisher?.white_label ?? false;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      logo_url:        "",
      contact_email:   "",
      bio:             "",
      name:            "",
      tagline:         "",
      brand_color:     "#FFD700",
      secondary_color: "#000000",
      font_family:     "inter",
      custom_domain:   "",
      twitter:         "",
      instagram:       "",
      facebook:        "",
      website:         "",
      themePreset:     "editorial",
      pageSurface:     "paper",
      navStyle:        "solid",
      cardStyle:       "shadow",
      headingStyle:    "italic",
      heroLayout:      "split",
      accentStyle:     "bold",
      showCategories:  true,
      showNewArrivals: true,
      showFeatured:    true,
    },
  });

  // ── Populate form when data loads ──────────────────────────────────────────
  useEffect(() => {
    if (!data) return;
    const t = data.tenant;
    const social = (t?.social_links as Record<string, string> | null) ?? {};
    const settings = (t?.store_settings as Record<string, any> | null) ?? {};

    form.reset({
      logo_url:        t?.logo_url        ?? "",
      contact_email:   t?.contact_email   ?? "",
      bio:             data.publisher.bio ?? "",
      name:            t?.name            ?? "",
      tagline:         (t as any)?.tagline ?? "",
      brand_color:     t?.brand_color     ?? "#FFD700",
      secondary_color: t?.secondary_color ?? "#000000",
      font_family:     normalizeStoreEnum((t as any)?.font_family, FONT_FAMILY_OPTIONS, "inter"),
      custom_domain:   data.publisher.custom_domain ?? "",
      twitter:         social.twitter   ?? "",
      instagram:       social.instagram ?? "",
      facebook:        social.facebook  ?? "",
      website:         social.website   ?? "",
      themePreset:     normalizeStoreEnum(settings.themePreset, THEME_PRESET_OPTIONS, "editorial"),
      pageSurface:     normalizeStoreEnum(settings.pageSurface, PAGE_SURFACE_OPTIONS, "paper"),
      navStyle:        normalizeStoreEnum(settings.navStyle, NAV_STYLE_OPTIONS, "solid"),
      cardStyle:       normalizeStoreEnum(settings.cardStyle, CARD_STYLE_OPTIONS, "shadow"),
      headingStyle:    normalizeStoreEnum(settings.headingStyle, HEADING_STYLE_OPTIONS, "italic"),
      heroLayout:      normalizeStoreEnum(settings.heroLayout, HERO_LAYOUT_OPTIONS, "split"),
      accentStyle:     normalizeStoreEnum(settings.accentStyle, ACCENT_STYLE_OPTIONS, "bold"),
      showCategories:  settings.showCategories  ?? true,
      showNewArrivals: settings.showNewArrivals ?? true,
      showFeatured:    settings.showFeatured     ?? true,
    });
  }, [data, form]);

  const onSubmit = (values: FormValues) => {
    update.mutate({
      logo_url:      values.logo_url     || null,
      contact_email: values.contact_email || null,
      bio:           values.bio          || null,
      name:          values.name,
      tagline:       values.tagline      || null,
      brand_color:   values.brand_color  || null,
      secondary_color: values.secondary_color || null,
      font_family:   values.font_family  ?? null,
      custom_domain: values.custom_domain || null,
      social_links: {
        twitter:   values.twitter   || null,
        instagram: values.instagram || null,
        facebook:  values.facebook  || null,
        website:   values.website   || null,
      },
      store_settings: {
        themePreset:     values.themePreset,
        pageSurface:     values.pageSurface,
        navStyle:        values.navStyle,
        cardStyle:       values.cardStyle,
        headingStyle:    values.headingStyle,
        heroLayout:      values.heroLayout,
        accentStyle:     values.accentStyle,
        showCategories:  values.showCategories,
        showNewArrivals: values.showNewArrivals,
        showFeatured:    values.showFeatured,
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={28} className="animate-spin" />
      </div>
    );
  }

  const slug = data?.publisher?.slug ?? data?.tenant?.slug ?? "";

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 md:px-6 space-y-12">
      {/* ── Header ── */}
      <div className="flex flex-col gap-2 border-b-[1.5px] border-black pb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-black uppercase italic tracking-tighter">
            Store Settings<span className="text-accent">.</span>
          </h1>
          {isWhiteLabel && <WhiteLabelBadge />}
        </div>
        <p className="text-sm text-gray-500 font-medium">
          Manage your public storefront appearance and details.
        </p>
      </div>

      {/* ── Store Link ── */}
      {slug && (
        <div className="space-y-3">
          <SectionHeader icon={ExternalLink} label="Your Store Link" />
          <StoreLinkCopy slug={slug} />
          <p className="text-[10px] text-gray-400 font-medium">
            Share this link with your customers. Books from all your authors appear here.
          </p>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-12">

          {/* ── Basic Branding (all publishers) ── */}
          <div>
            <SectionHeader icon={Upload} label="Basic Branding" />
            <div className="space-y-6">

              {/* Logo */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest">Store Logo</Label>
                <FormField
                  control={form.control}
                  name="logo_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <LogoUploadField
                          value={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Contact Email */}
              <FormField
                control={form.control}
                name="contact_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest">
                      Contact / Support Email
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        placeholder="hello@yourstore.com"
                        className="input-gumroad"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Bio */}
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest">
                      Store Bio / About
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value ?? ""}
                        placeholder="Tell customers what your store is about…"
                        rows={4}
                        className="input-gumroad resize-none"
                      />
                    </FormControl>
                    <p className="text-[10px] text-gray-400 font-medium">
                      {(field.value?.length ?? 0)}/500 characters
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* ── White-Label Customisation ── */}
          <div>
            <div className="flex items-center gap-3 mb-6 pb-3 border-b-[1.5px] border-black">
              <div className="w-8 h-8 bg-black flex items-center justify-center">
                <Palette size={14} className="text-accent" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.25em]">
                Brand & Colours
              </span>
              {!isWhiteLabel && <WhiteLabelBadge />}
            </div>

            {isWhiteLabel ? (
              <div className="space-y-6">

                {/* Store display name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest">
                        Store Display Name
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ""}
                          placeholder="e.g. Prym Books"
                          className="input-gumroad"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Tagline */}
                <FormField
                  control={form.control}
                  name="tagline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest">
                        Tagline
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ""}
                          placeholder="e.g. African Stories, Boldly Told."
                          className="input-gumroad"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Colors */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="brand_color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest">
                          Accent / Brand Color
                        </FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={field.value ?? "#FFD700"}
                              onChange={(e) => field.onChange(e.target.value)}
                              className="w-10 h-10 border-[1.5px] border-black cursor-pointer p-0.5 bg-white"
                            />
                            <Input
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value)}
                              placeholder="#FFD700"
                              className="input-gumroad font-mono text-sm"
                            />
                            <ColorSwatch color={field.value ?? ""} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="secondary_color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest">
                          Secondary Color
                        </FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={field.value ?? "#000000"}
                              onChange={(e) => field.onChange(e.target.value)}
                              className="w-10 h-10 border-[1.5px] border-black cursor-pointer p-0.5 bg-white"
                            />
                            <Input
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value)}
                              placeholder="#000000"
                              className="input-gumroad font-mono text-sm"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Font */}
                <FormField
                  control={form.control}
                  name="font_family"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest">
                        Typography
                      </FormLabel>
                      {/* <pre className="text-[10px] text-red-500">Current Value: "{field.value}"</pre> */}
                      <Select
                        value={field.value ?? "inter"}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="input-gumroad">
                            <SelectValue placeholder="Select a font family" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-white text-black border-[1.5px] border-black rounded-none">
                          <SelectItem value="inter">Inter — Clean & Modern</SelectItem>
                          <SelectItem value="playfair">Playfair Display — Classic & Literary</SelectItem>
                          <SelectItem value="space-grotesk">Space Grotesk — Techy & Bold</SelectItem>
                          <SelectItem value="lora">Lora — Warm & Editorial</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ) : (
              <LockedSection>
                <div className="space-y-6">
                  <Input placeholder="Store Display Name" className="input-gumroad" disabled />
                  <Input placeholder="Tagline" className="input-gumroad" disabled />
                  <div className="grid grid-cols-2 gap-4">
                    <Input placeholder="#FFD700" className="input-gumroad font-mono" disabled />
                    <Input placeholder="#000000" className="input-gumroad font-mono" disabled />
                  </div>
                </div>
              </LockedSection>
            )}
          </div>

          {/* ── Store Layout (white-label only) ── */}
          <div>
            <div className="flex items-center gap-3 mb-6 pb-3 border-b-[1.5px] border-black">
              <div className="w-8 h-8 bg-black flex items-center justify-center">
                <LayoutTemplate size={14} className="text-accent" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.25em]">
                Layout &amp; Sections
              </span>
              {!isWhiteLabel && <WhiteLabelBadge />}
            </div>

            {isWhiteLabel ? (
              <div className="space-y-6">
                {/* Hero layout */}
                <FormField
                  control={form.control}
                  name="heroLayout"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest">
                        Hero Section Style
                      </FormLabel>
                      <div className="grid grid-cols-3 gap-3">
                        {(["split", "full", "minimal"] as const).map((layout) => (
                          <button
                            key={layout}
                            type="button"
                            onClick={() => field.onChange(layout)}
                            className={`px-4 py-3 border-[1.5px] text-[10px] font-black uppercase tracking-widest transition-all ${
                              field.value === layout
                                ? "border-black bg-black text-white"
                                : "border-black/20 bg-white hover:border-black"
                            }`}
                          >
                            {layout}
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-gray-400 font-medium">
                        Split: image + text side by side. Full: full-width image. Minimal: text only.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Accent style */}
                <FormField
                  control={form.control}
                  name="accentStyle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest">
                        Button & Accent Style
                      </FormLabel>
                      <div className="grid grid-cols-3 gap-3">
                        {(["bold", "outline", "soft"] as const).map((style) => (
                          <button
                            key={style}
                            type="button"
                            onClick={() => field.onChange(style)}
                            className={`px-4 py-3 border-[1.5px] text-[10px] font-black uppercase tracking-widest transition-all ${
                              field.value === style
                                ? "border-black bg-black text-white"
                                : "border-black/20 bg-white hover:border-black"
                            }`}
                          >
                            {style}
                          </button>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-6 border-[1.5px] border-black/10 p-5">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest">Storefront Direction</p>
                    <p className="text-[10px] text-gray-500 font-medium">
                      Shape how different your publisher store feels from the main platform experience.
                    </p>
                  </div>

                  <FormField
                    control={form.control}
                    name="themePreset"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest">
                          Theme Preset
                        </FormLabel>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {STOREFRONT_THEME_PRESETS.map((preset) => (
                            <button
                              key={preset.value}
                              type="button"
                              onClick={() => field.onChange(preset.value)}
                              className={`border-[1.5px] px-4 py-4 text-left transition-all ${
                                field.value === preset.value
                                  ? "border-black bg-black text-white"
                                  : "border-black/15 bg-white hover:border-black"
                              }`}
                            >
                              <p className="text-[11px] font-black uppercase tracking-widest">{preset.label}</p>
                              <p className={`mt-1 text-[10px] font-medium ${field.value === preset.value ? "text-white/70" : "text-gray-500"}`}>
                                {preset.description}
                              </p>
                            </button>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="pageSurface"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest">
                            Page Surface
                          </FormLabel>
                          <Select value={field.value ?? "paper"} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="input-gumroad">
                                <SelectValue placeholder="Select a surface" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-white text-black border-[1.5px] border-black rounded-none">
                              {STOREFRONT_PAGE_SURFACES.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-[10px] text-gray-500 font-medium">
                            {STOREFRONT_PAGE_SURFACES.find((option) => option.value === field.value)?.description ?? "Choose the general backdrop for your store."}
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="navStyle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest">
                            Navigation Style
                          </FormLabel>
                          <Select value={field.value ?? "solid"} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="input-gumroad">
                                <SelectValue placeholder="Select navigation style" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-white text-black border-[1.5px] border-black rounded-none">
                              {STOREFRONT_NAV_STYLES.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-[10px] text-gray-500 font-medium">
                            {STOREFRONT_NAV_STYLES.find((option) => option.value === field.value)?.description ?? "Choose how the header sits in the store."}
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="cardStyle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest">
                            Product Card Shell
                          </FormLabel>
                          <Select value={field.value ?? "shadow"} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="input-gumroad">
                                <SelectValue placeholder="Select card style" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-white text-black border-[1.5px] border-black rounded-none">
                              {STOREFRONT_CARD_STYLES.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-[10px] text-gray-500 font-medium">
                            {STOREFRONT_CARD_STYLES.find((option) => option.value === field.value)?.description ?? "Choose how product cards feel in the catalog."}
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="headingStyle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest">
                            Heading Treatment
                          </FormLabel>
                          <Select value={field.value ?? "italic"} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="input-gumroad">
                                <SelectValue placeholder="Select heading treatment" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-white text-black border-[1.5px] border-black rounded-none">
                              {STOREFRONT_HEADING_STYLES.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-[10px] text-gray-500 font-medium">
                            {STOREFRONT_HEADING_STYLES.find((option) => option.value === field.value)?.description ?? "Choose how section headings should feel."}
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="border-[1.5px] border-black bg-[#FAF9F6] p-4 gumroad-shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Live Theme Summary</p>
                    <div className="mt-3 grid gap-2 text-[11px] font-bold">
                      <p>Preset: {STOREFRONT_THEME_PRESETS.find((option) => option.value === form.watch("themePreset"))?.label ?? "Editorial"}</p>
                      <p>Surface: {STOREFRONT_PAGE_SURFACES.find((option) => option.value === form.watch("pageSurface"))?.label ?? "Paper"}</p>
                      <p>Navigation: {STOREFRONT_NAV_STYLES.find((option) => option.value === form.watch("navStyle"))?.label ?? "Solid"}</p>
                      <p>Cards: {STOREFRONT_CARD_STYLES.find((option) => option.value === form.watch("cardStyle"))?.label ?? "Shadow"}</p>
                      <p>Headings: {STOREFRONT_HEADING_STYLES.find((option) => option.value === form.watch("headingStyle"))?.label ?? "Italic"}</p>
                    </div>
                  </div>
                </div>

                {/* Section toggles */}
                <div className="space-y-4 border-[1.5px] border-black/10 p-5">
                  <p className="text-[10px] font-black uppercase tracking-widest mb-4">
                    Visible Sections
                  </p>
                  {([
                    { name: "showFeatured",    label: "Featured Books" },
                    { name: "showNewArrivals", label: "New Arrivals" },
                    { name: "showCategories",  label: "Browse by Category" },
                  ] as const).map(({ name, label }) => (
                    <FormField
                      key={name}
                      control={form.control}
                      name={name}
                      render={({ field }) => (
                        <div className="flex items-center justify-between py-1">
                          <Label className="text-xs font-semibold cursor-pointer" htmlFor={name}>
                            {label}
                          </Label>
                          <Switch
                            id={name}
                            checked={field.value ?? true}
                            onCheckedChange={field.onChange}
                          />
                        </div>
                      )}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <LockedSection>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="px-4 py-3 border-[1.5px] border-black bg-black text-white text-[10px] font-black uppercase">Split</div>
                    <div className="px-4 py-3 border-[1.5px] border-black/20 text-[10px] font-black uppercase">Full</div>
                    <div className="px-4 py-3 border-[1.5px] border-black/20 text-[10px] font-black uppercase">Minimal</div>
                  </div>
                </div>
              </LockedSection>
            )}
          </div>

          {/* ── Custom Domain (white-label only) ── */}
          {/* <div>
            <div className="flex items-center gap-3 mb-6 pb-3 border-b-[1.5px] border-black">
              <div className="w-8 h-8 bg-black flex items-center justify-center">
                <Globe size={14} className="text-accent" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.25em]">Custom Domain</span>
              {!isWhiteLabel && <WhiteLabelBadge />}
            </div>

            {isWhiteLabel ? (
              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="custom_domain"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest">
                        Your Domain
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ""}
                          placeholder="books.yourbrand.com"
                          className="input-gumroad font-mono"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="text-[10px] text-gray-400 font-medium space-y-1 bg-black/[0.03] p-4 border-[1.5px] border-black/10">
                  <p className="font-black uppercase tracking-widest text-black mb-2">DNS Setup</p>
                  <p>1. Add a CNAME record pointing <strong>books.yourbrand.com</strong> → <strong>cname.booka.africa</strong></p>
                  <p>2. SSL is provisioned automatically within 24 hours.</p>
                </div>
              </div>
            ) : (
              <LockedSection>
                <Input placeholder="books.yourbrand.com" className="input-gumroad font-mono" disabled />
              </LockedSection>
            )}
          </div> */}

          {/* ── Social Links (white-label only) ── */}
          <div>
            <div className="flex items-center gap-3 mb-6 pb-3 border-b-[1.5px] border-black">
              <div className="w-8 h-8 bg-black flex items-center justify-center">
                <Share2 size={14} className="text-accent" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.25em]">Social Links</span>
              {!isWhiteLabel && <WhiteLabelBadge />}
            </div>

            {isWhiteLabel ? (
              <div className="space-y-4">
                {([
                  { name: "website",   label: "Website",   placeholder: "https://yoursite.com" },
                  { name: "twitter",   label: "X / Twitter", placeholder: "https://x.com/yourhandle" },
                  { name: "instagram", label: "Instagram", placeholder: "https://instagram.com/yourhandle" },
                  { name: "facebook",  label: "Facebook",  placeholder: "https://facebook.com/yourpage" },
                ] as const).map(({ name, label, placeholder }) => (
                  <FormField
                    key={name}
                    control={form.control}
                    name={name}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest">
                          {label}
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ""}
                            placeholder={placeholder}
                            className="input-gumroad"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            ) : (
              <LockedSection>
                <div className="space-y-4">
                  <Input placeholder="https://yoursite.com" className="input-gumroad" disabled />
                  <Input placeholder="https://x.com/yourhandle" className="input-gumroad" disabled />
                  <Input placeholder="https://instagram.com/yourhandle" className="input-gumroad" disabled />
                </div>
              </LockedSection>
            )}
          </div>

          {/* ── Save ── */}
          <div className="sticky bottom-0 py-4 bg-white border-t-[1.5px] border-black -mx-4 md:-mx-6 px-4 md:px-6 flex items-center justify-between gap-4 z-10">
            <p className="text-[10px] font-medium text-gray-400 hidden sm:block">
              Changes apply to your public storefront immediately.
            </p>
            <Button
              type="submit"
              disabled={update.isPending}
              className="booka-button-primary h-11 px-8 ml-auto"
            >
              {update.isPending ? (
                <>
                  <Loader2 size={14} className="animate-spin mr-2" />
                  Saving…
                </>
              ) : (
                "Save Settings"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
