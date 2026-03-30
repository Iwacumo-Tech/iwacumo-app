"use client";


import { useState } from "react";
import { trpc } from "@/app/_providers/trpc-provider";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  ChevronDown, ChevronRight, Loader2, Info,
  RotateCcw, Check, BookOpen, Users,
} from "lucide-react";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn }       from "@/lib/utils";

// ─── Sub-components (all at module level — hard rule #4) ──────────────────────

function SectionHeader({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="flex items-end justify-between border-b-[1.5px] border-black pb-4 mb-8">
      <div>
        <h1 className="text-3xl font-black uppercase italic tracking-tighter">
          {label}<span className="text-accent">.</span>
        </h1>
        {sub && <p className="text-xs font-medium text-gray-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function SplitBar({ publisherPct }: { publisherPct: number }) {
  const authorPct = 100 - publisherPct;
  return (
    <div className="w-full h-2 flex overflow-hidden border border-black/10">
      <div className="bg-black transition-all duration-300" style={{ width: `${publisherPct}%` }} />
      <div className="bg-accent transition-all duration-300" style={{ width: `${authorPct}%` }} />
    </div>
  );
}

function SplitLegend({ publisherPct }: { publisherPct: number }) {
  return (
    <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-widest mt-1">
      <span className="flex items-center gap-1">
        <span className="inline-block w-3 h-3 bg-black" />
        Publisher {publisherPct}%
      </span>
      <span className="flex items-center gap-1">
        <span className="inline-block w-3 h-3 bg-accent border border-black/10" />
        Author {100 - publisherPct}%
      </span>
    </div>
  );
}

function PercentInput({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative w-24">
        <Input
          type="number"
          min={0}
          max={95}
          step={1}
          value={value || ""}
          onChange={(e) => {
            const v = e.target.value === "" ? 0 : Number(e.target.value);
            onChange(Math.min(95, Math.max(0, v)));
          }}
          disabled={disabled}
          className="input-gumroad pr-8 text-right font-black"
        />
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400">
          %
        </span>
      </div>
      <span className="text-[10px] font-medium text-gray-400">publisher's share</span>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface BookData {
  id:        string;
  title:     string;
  status:    string;
  published: boolean;
  split_override: {
    id:                      string;
    publisher_split_percent: number;
    notes:                   string | null;
  } | null;
}

interface AuthorData {
  id:    string;
  name:  string;
  email: string;
  default_split: {
    id:                      string;
    publisher_split_percent: number;
    notes:                   string | null;
  } | null;
  books: BookData[];
}

// ─── AuthorRow ────────────────────────────────────────────────────────────────

function AuthorRow({ author }: { author: AuthorData }) {
  const utils = trpc.useUtils();

  const [expanded,     setExpanded]     = useState(false);
  const [defaultPct,   setDefaultPct]   = useState(author.default_split?.publisher_split_percent ?? 30);
  const [defaultNotes, setDefaultNotes] = useState(author.default_split?.notes ?? "");

  const [overrides, setOverrides] = useState<
    Record<string, { pct: number; notes: string; dirty: boolean }>
  >(() =>
    Object.fromEntries(
      author.books.map(b => [
        b.id,
        {
          pct:   b.split_override?.publisher_split_percent ?? (author.default_split?.publisher_split_percent ?? 30),
          notes: b.split_override?.notes ?? "",
          dirty: false,
        },
      ])
    )
  );

  const setDefault = trpc.setPublisherAuthorSplit.useMutation({
    onSuccess: () => {
      toast.success(`Default split saved for ${author.name}.`);
      utils.getPublisherSplits.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const setOverride = trpc.setBookSplitOverride.useMutation({
    onSuccess: (_, vars) => {
      toast.success("Book split saved.");
      setOverrides(prev => ({
        ...prev,
        [vars.book_id]: { ...prev[vars.book_id]!, dirty: false },
      }));
      utils.getPublisherSplits.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const removeOverride = trpc.deleteBookSplitOverride.useMutation({
    onSuccess: (_, vars) => {
      toast.success("Override removed — using author default.");
      setOverrides(prev => ({
        ...prev,
        [vars.book_id]: { pct: defaultPct, notes: "", dirty: false },
      }));
      utils.getPublisherSplits.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const defaultChanged =
    defaultPct   !== (author.default_split?.publisher_split_percent ?? 30) ||
    defaultNotes !== (author.default_split?.notes ?? "");

  return (
    <div className="border-[1.5px] border-black bg-white gumroad-shadow-sm">
      {/* Author header row */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-black/[0.02] transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-black flex items-center justify-center text-accent text-[10px] font-black shrink-0">
            {author.name.charAt(0).toUpperCase()}
          </div>
          <div className="text-left">
            <p className="font-black uppercase italic text-sm tracking-wide">{author.name}</p>
            <p className="text-[10px] font-medium text-gray-400">{author.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden sm:block w-32">
            <SplitBar publisherPct={defaultPct} />
            <SplitLegend publisherPct={defaultPct} />
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
            <BookOpen size={12} />
            {author.books.length} books
          </div>
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="border-t-[1.5px] border-black divide-y-[1.5px] divide-black/10">

          {/* Default split */}
          <div className="px-6 py-5 bg-black/[0.02]">
            <p className="text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2">
              <Users size={11} />
              Default Split — All Books by {author.name.split(" ")[0]}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest">
                  Publisher's % of remainder
                </label>
                <PercentInput
                  value={defaultPct}
                  onChange={setDefaultPct}
                  disabled={setDefault.isPending}
                />
                <div className="pt-1">
                  <SplitBar publisherPct={defaultPct} />
                  <SplitLegend publisherPct={defaultPct} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest">
                  Notes / Contract ref (optional)
                </label>
                <Textarea
                  value={defaultNotes}
                  onChange={(e) => setDefaultNotes(e.target.value)}
                  placeholder="e.g. Per contract Jan 2026"
                  rows={3}
                  disabled={setDefault.isPending}
                  className="input-gumroad resize-none text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={() =>
                  setDefault.mutate({
                    author_id:               author.id,
                    publisher_split_percent: defaultPct,
                    notes:                   defaultNotes || undefined,
                  })
                }
                disabled={setDefault.isPending || !defaultChanged}
                className="booka-button-primary h-10 px-6 text-xs"
              >
                {setDefault.isPending
                  ? <><Loader2 size={12} className="animate-spin mr-2" />Saving…</>
                  : <><Check size={12} className="mr-2" />Save Default</>
                }
              </Button>
              {!defaultChanged && author.default_split && (
                <span className="text-[10px] font-medium text-green-600 flex items-center gap-1">
                  <Check size={10} /> Saved
                </span>
              )}
            </div>

            <p className="text-[10px] text-gray-400 font-medium mt-3 flex items-start gap-1.5">
              <Info size={10} className="mt-0.5 shrink-0" />
              After platform fee: publisher takes {defaultPct}%, author takes {100 - defaultPct}%.
              Per-book overrides below take precedence.
            </p>
          </div>

          {/* Per-book overrides */}
          {author.books.length > 0 && (
            <div className="px-6 py-5">
              <p className="text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                <BookOpen size={11} />
                Per-Book Overrides
              </p>

              <div className="space-y-4">
                {author.books.map((book) => {
                  const ov         = overrides[book.id];
                  const hasOverride = !!book.split_override;
                  const isDirty    = ov?.dirty;

                  return (
                    <div
                      key={book.id}
                      className={cn(
                        "border-[1.5px] p-4",
                        hasOverride ? "border-black bg-accent/5" : "border-black/10"
                      )}
                    >
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-3">
                            <p className="font-black uppercase italic text-sm truncate">{book.title}</p>
                            <span className={cn(
                              "text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 border",
                              book.published
                                ? "border-green-400 text-green-600 bg-green-50"
                                : "border-black/20 text-gray-400"
                            )}>
                              {book.published ? "Published" : "Draft"}
                            </span>
                            {hasOverride && (
                              <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-accent border border-black text-black">
                                Override Active
                              </span>
                            )}
                          </div>

                          <PercentInput
                            value={ov?.pct ?? defaultPct}
                            onChange={(v) =>
                              setOverrides(prev => ({
                                ...prev,
                                [book.id]: { ...prev[book.id]!, pct: v, dirty: true },
                              }))
                            }
                            disabled={setOverride.isPending || removeOverride.isPending}
                          />

                          <div className="mt-2 w-48">
                            <SplitBar publisherPct={ov?.pct ?? defaultPct} />
                            <SplitLegend publisherPct={ov?.pct ?? defaultPct} />
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 shrink-0">
                          <Button
                            onClick={() =>
                              setOverride.mutate({
                                book_id:                 book.id,
                                publisher_split_percent: ov?.pct ?? defaultPct,
                                notes:                   ov?.notes || undefined,
                              })
                            }
                            disabled={setOverride.isPending || (!isDirty && hasOverride)}
                            className="booka-button-primary h-9 px-4 text-[10px]"
                          >
                            {setOverride.isPending
                              ? <Loader2 size={10} className="animate-spin" />
                              : "Set Override"
                            }
                          </Button>

                          {hasOverride && (
                            <Button
                              variant="outline"
                              onClick={() => removeOverride.mutate({ book_id: book.id })}
                              disabled={removeOverride.isPending}
                              className="h-9 px-4 text-[10px] border-[1.5px] border-black rounded-none font-black uppercase hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                            >
                              {removeOverride.isPending
                                ? <Loader2 size={10} className="animate-spin" />
                                : <><RotateCcw size={10} className="mr-1" />Reset</>
                              }
                            </Button>
                          )}
                        </div>
                      </div>

                      {!hasOverride && (
                        <p className="text-[9px] font-medium text-gray-400 mt-2">
                          Using author default ({defaultPct}% publisher / {100 - defaultPct}% author).
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {author.books.length === 0 && (
            <div className="px-6 py-8 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-30">
                No books under this author yet.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SplitsSettingsPage() {
  const { data: session } = useSession();

  // Pass an empty object — schema is .optional() so {} and undefined both work,
  // but tRPC's type system requires a matching object shape, not undefined.
  const { data, isLoading } = trpc.getPublisherSplits.useQuery(
    {},
    { enabled: !!session?.user?.id }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={28} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 md:px-6">
      <SectionHeader
        label="Revenue Splits"
        sub="Set your default cut per author and override it per book. Platform fee is deducted first, then the remainder is split."
      />

      {/* Explainer */}
      <div className="mb-8 p-4 border-[1.5px] border-black/10 bg-black/[0.02] flex gap-3">
        <Info size={14} className="shrink-0 mt-0.5 text-accent" />
        <div className="text-xs font-medium text-gray-600 space-y-1">
          <p>
            <strong>Priority:</strong> Book override → Author default → Platform fallback (30% publisher / 70% author).
          </p>
          <p>
            <strong>Example:</strong> ₦10,000 sale · 10% platform fee → ₦9,000 remainder.
            At 30% publisher: you get ₦2,700, author gets ₦6,300.
          </p>
        </div>
      </div>

      {!data?.authors?.length ? (
        <div className="py-20 border-[1.5px] border-dashed border-black/10 text-center">
          <p className="font-black uppercase italic opacity-20 text-lg">No authors yet.</p>
          <p className="text-xs text-gray-400 mt-2">
            Add authors to your publisher account to configure splits.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {data.authors.map((author) => (
            <AuthorRow key={author.id} author={author} />
          ))}
        </div>
      )}
    </div>
  );
}