"use client";
// src/app/(app)/app/categories/page.tsx

import { trpc } from "@/app/_providers/trpc-provider";
import { CategoryForm }   from "@/components/categories/category-form";
import { DeleteCategory } from "@/components/categories/delete-category";
import { Loader2, Tag, BookOpen } from "lucide-react";

export default function CategoriesPage() {
  const { data: categories, isLoading } = trpc.getAllCategories.useQuery();

  const total     = categories?.length ?? 0;
  const withBooks = categories?.filter((c) => c._count.books > 0).length ?? 0;

  return (
    <div className="space-y-10">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b-4 border-black pb-8">
        <div>
          <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter">
            Categories<span className="text-accent">.</span>
          </h1>
          <p className="font-bold text-xs uppercase opacity-40 tracking-widest mt-2">
            Organise your book catalogue
          </p>
        </div>
        <CategoryForm />
      </div>

      {/* ── Stat cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 max-w-sm">
        {[
          { label: "Total Categories", value: total,     Icon: Tag      },
          { label: "In Use",           value: withBooks, Icon: BookOpen },
        ].map(({ label, value, Icon }) => (
          <div key={label} className="booka-stat-card flex items-center gap-4">
            <div className="w-10 h-10 border-2 border-black flex items-center justify-center shrink-0">
              <Icon className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-black">{value}</p>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-50">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Table ──────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex items-center gap-3 p-8 text-sm font-bold uppercase tracking-widest opacity-40">
          <Loader2 size={16} className="animate-spin" />
          Loading categories...
        </div>
      ) : !categories || categories.length === 0 ? (
        <div className="border-4 border-black p-12 text-center space-y-3">
          <Tag className="size-10 mx-auto opacity-20" />
          <p className="font-black uppercase italic tracking-tighter text-xl opacity-40">
            No categories yet
          </p>
          <p className="text-sm opacity-40">
            Create your first category to start organising books.
          </p>
        </div>
      ) : (
        <div className="border-4 border-black">

          {/* Table header */}
          <div className="grid grid-cols-[2fr_2fr_3fr_1fr_auto] gap-4 px-6 py-3 border-b-4 border-black bg-black text-white">
            {["Name", "Slug", "Description", "Books", ""].map((h) => (
              <p key={h} className="font-black uppercase text-[10px] tracking-widest">
                {h}
              </p>
            ))}
          </div>

          {/* Rows */}
          {categories.map((cat, i) => (
            <div
              key={cat.id}
              className={`grid grid-cols-[2fr_2fr_3fr_1fr_auto] gap-4 items-center px-6 py-4
                ${i !== categories.length - 1 ? "border-b-2 border-black/10" : ""}
                hover:bg-accent/10 transition-colors`}
            >
              {/* Name + icon */}
              <div className="flex items-center gap-2 min-w-0">
                {cat.icon && (
                  <span className="text-xl shrink-0">{cat.icon}</span>
                )}
                <p className="font-black text-sm truncate">{cat.name}</p>
              </div>

              {/* Slug */}
              <p className="font-mono text-xs opacity-50 truncate">{cat.slug}</p>

              {/* Description */}
              <p className="text-sm opacity-60 truncate">
                {cat.description || <span className="italic opacity-40">—</span>}
              </p>

              {/* Book count */}
              <div className="flex items-center gap-1">
                <span
                  className={`inline-flex items-center border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide
                    ${cat._count.books > 0 ? "bg-accent border-black" : "bg-white border-black/20 opacity-40"}`}
                >
                  {cat._count.books}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <CategoryForm category={cat} />
                <DeleteCategory
                  id={cat.id}
                  name={cat.name}
                  bookCount={cat._count.books}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}