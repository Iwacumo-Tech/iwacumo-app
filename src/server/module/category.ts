import { z } from "zod";
import { publicProcedure } from "@/server/trpc";
import { TRPCError } from "@trpc/server";
import prisma from "@/lib/prisma";
 
// ── Shared slug generator ─────────────────────────────────────
function toSlug(str: string) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
 
// ── getAllCategories ──────────────────────────────────────────
export const getAllCategories = publicProcedure.query(async () => {
  return await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { books: true } } },
  });
});
 
// ── getCategoryById ───────────────────────────────────────────
export const getCategoryById = publicProcedure
  .input(z.object({ id: z.string() }))
  .query(async ({ input }) => {
    const category = await prisma.category.findUnique({
      where: { id: input.id },
      include: { _count: { select: { books: true } } },
    });
 
    if (!category) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Category not found." });
    }
 
    return category;
  });
 
// ── createCategory ────────────────────────────────────────────
export const createCategory = publicProcedure
  .input(
    z.object({
      name:        z.string().min(1, "Name is required").max(80),
      slug:        z.string().optional(), // auto-generated from name if not provided
      description: z.string().max(500).optional(),
      icon:        z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    const slug = input.slug
      ? toSlug(input.slug)
      : toSlug(input.name);
 
    // Check uniqueness
    const existing = await prisma.category.findFirst({
      where: { OR: [{ name: input.name }, { slug }] },
    });
 
    if (existing) {
      throw new TRPCError({
        code: "CONFLICT",
        message:
          existing.name === input.name
            ? "A category with this name already exists."
            : "A category with this slug already exists.",
      });
    }
 
    return await prisma.category.create({
      data: {
        name:        input.name,
        slug,
        description: input.description ?? null,
        icon:        input.icon ?? null,
      },
    });
  });
 
// ── updateCategory ────────────────────────────────────────────
export const updateCategory = publicProcedure
  .input(
    z.object({
      id:          z.string(),
      name:        z.string().min(1).max(80).optional(),
      slug:        z.string().optional(),
      description: z.string().max(500).nullable().optional(),
      icon:        z.string().nullable().optional(),
    })
  )
  .mutation(async ({ input }) => {
    const { id, ...rest } = input;
 
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Category not found." });
    }
 
    // If name changed, auto-update slug unless a slug was explicitly provided
    const newSlug = rest.slug
      ? toSlug(rest.slug)
      : rest.name
      ? toSlug(rest.name)
      : undefined;
 
    // Conflict check — exclude self
    if (rest.name || newSlug) {
      const conflict = await prisma.category.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            { OR: [
              rest.name ? { name: rest.name } : {},
              newSlug   ? { slug: newSlug }   : {},
            ]},
          ],
        },
      });
 
      if (conflict) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Another category already uses this name or slug.",
        });
      }
    }
 
    return await prisma.category.update({
      where: { id },
      data: {
        ...(rest.name        !== undefined ? { name: rest.name }               : {}),
        ...(newSlug          !== undefined ? { slug: newSlug }                 : {}),
        ...(rest.description !== undefined ? { description: rest.description } : {}),
        ...(rest.icon        !== undefined ? { icon: rest.icon }               : {}),
      },
    });
  });
 
// ── deleteCategory ────────────────────────────────────────────
export const deleteCategory = publicProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ input }) => {
    const category = await prisma.category.findUnique({
      where: { id: input.id },
      include: { _count: { select: { books: true } } },
    });
 
    if (!category) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Category not found." });
    }
 
    if (category._count.books > 0) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: `Cannot delete "${category.name}" — it has ${category._count.books} book${category._count.books === 1 ? "" : "s"} assigned. Reassign them first.`,
      });
    }
 
    await prisma.category.delete({ where: { id: input.id } });
    return { success: true };
  });