import { z } from "zod";
import { publicProcedure } from "../trpc";
import prisma from "@/lib/prisma";
import { TRPCError } from "@trpc/server";
 
// ─── Input schema ────────────────────────────────────────────────────────────
 
export const updateStoreSettingsSchema = z.object({
  // Basic (all publishers)
  logo_url:       z.string().url().nullable().optional(),
  contact_email:  z.string().email().nullable().optional(),
  bio:            z.string().max(500).nullable().optional(),       // maps to Publisher.bio
 
  // White-label only — ignored server-side if !white_label
  name:              z.string().min(1).max(80).optional(),
  tagline:           z.string().max(120).nullable().optional(),
  brand_color:       z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
  secondary_color:   z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
  font_family:       z.enum(["inter", "playfair", "space-grotesk", "lora"]).nullable().optional(),
  custom_domain:     z.string().nullable().optional(),
  social_links:      z.object({
    twitter:   z.string().url().nullable().optional(),
    instagram: z.string().url().nullable().optional(),
    facebook:  z.string().url().nullable().optional(),
    website:   z.string().url().nullable().optional(),
  }).nullable().optional(),
  store_settings: z.object({
    heroLayout:      z.enum(["split", "full", "minimal"]).optional(),
    accentStyle:     z.enum(["bold", "outline", "soft"]).optional(),
    showCategories:  z.boolean().optional(),
    showNewArrivals: z.boolean().optional(),
    showFeatured:    z.boolean().optional(),
  }).nullable().optional(),
});
 
export type TUpdateStoreSettingsSchema = z.infer<typeof updateStoreSettingsSchema>;
 
// ─── Get store settings ───────────────────────────────────────────────────────
 
export const getPublisherStoreSettings = publicProcedure.query(async ({ ctx }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ 
      code: "UNAUTHORIZED", 
      message: "You must be logged in to view store settings." 
    });
  }
  const userId = ctx.session.user.id;
 
  const publisher = await prisma.publisher.findUnique({
    where: { user_id: userId },
    include: { tenant: true },
  });
 
  if (!publisher) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Publisher profile not found" });
  }
 
  return {
    publisher: {
      id:              publisher.id,
      bio:             publisher.bio,
      slug:            publisher.slug,
      white_label:     publisher.white_label,
      custom_domain:   publisher.custom_domain,
    },
    tenant: publisher.tenant
      ? {
          id:              publisher.tenant.id,
          name:            publisher.tenant.name,
          slug:            publisher.tenant.slug,
          logo_url:        publisher.tenant.logo_url,
          contact_email:   publisher.tenant.contact_email,
          brand_color:     publisher.tenant.brand_color,
          secondary_color: publisher.tenant.secondary_color,
          tagline:         (publisher.tenant as any).tagline ?? null,
          font_family:     (publisher.tenant as any).font_family ?? null,
          social_links:    publisher.tenant.social_links,
          store_settings:  (publisher.tenant as any).store_settings ?? null,
        }
      : null,
  };
});
 
// ─── Update store settings ───────────────────────────────────────────────────
 
export const updatePublisherStoreSettings = publicProcedure
  .input(updateStoreSettingsSchema)
  .mutation(async ({ ctx, input }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ 
        code: "UNAUTHORIZED", 
        message: "You must be logged in to update store settings." 
      });
    }
    const userId = ctx.session.user.id;
 
    const publisher = await prisma.publisher.findUnique({
      where:   { user_id: userId },
      include: { tenant: true },
    });
 
    if (!publisher) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Publisher profile not found" });
    }
 
    const isWhiteLabel = publisher.white_label;
 
    // ── 1. Update Publisher.bio / custom_domain ──────────────────────────────
    await prisma.publisher.update({
      where: { id: publisher.id },
      data: {
        ...(input.bio !== undefined          ? { bio: input.bio }                      : {}),
        ...(isWhiteLabel && input.custom_domain !== undefined
          ? { custom_domain: input.custom_domain }
          : {}),
      },
    });
 
    // ── 2. Update Tenant branding ────────────────────────────────────────────
    if (publisher.tenant) {
      const tenantData: Record<string, any> = {};
 
      // Basic — available to all publishers
      if (input.logo_url     !== undefined) tenantData.logo_url     = input.logo_url;
      if (input.contact_email !== undefined) tenantData.contact_email = input.contact_email;
 
      // White-label only
      if (isWhiteLabel) {
        if (input.name            !== undefined) tenantData.name            = input.name;
        if (input.tagline         !== undefined) tenantData.tagline         = input.tagline;
        if (input.brand_color     !== undefined) tenantData.brand_color     = input.brand_color;
        if (input.secondary_color !== undefined) tenantData.secondary_color = input.secondary_color;
        if (input.font_family     !== undefined) tenantData.font_family     = input.font_family;
        if (input.social_links    !== undefined) tenantData.social_links    = input.social_links;
        if (input.store_settings  !== undefined) tenantData.store_settings  = input.store_settings;
      }
 
      if (Object.keys(tenantData).length > 0) {
        await prisma.tenant.update({
          where: { id: publisher.tenant.id },
          data:  tenantData,
        });
      }
    }
 
    return { success: true };
  });