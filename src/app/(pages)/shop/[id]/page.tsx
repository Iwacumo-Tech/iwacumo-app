"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ChevronLeft, ChevronRight, ShoppingCart, Star, BookOpen,
  Truck, CheckCircle2, Package, Minus, Plus, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { trpc } from "@/app/_providers/trpc-provider";
import { useToast } from "@/components/ui/use-toast";
import { useCartStore } from "@/store/use-cart-store";
import { GUEST_CART_KEY, notifyCartUpdate } from "@/lib/cart-utils";

// ─── Format metadata (module level — hard rule #4) ────────────────────────────

const FORMAT_META: Record<string, {
  label:       string;
  icon:        React.ElementType;
  description: string;
  maxQty:      number;   // 1 for ebooks — can't buy two copies of a digital file
}> = {
  ebook:     { label: "E-Book",    icon: Download, description: "Instant digital download",         maxQty: 1 },
  paperback: { label: "Paperback", icon: Truck,    description: "Printed & shipped to your door",   maxQty: 99 },
  hardcover: { label: "Hardcover", icon: Package,  description: "Premium hardcover, shipped to you", maxQty: 99 },
};

// ─── FormatCard (module level) ────────────────────────────────────────────────

function FormatCard({
  format,
  price,
  selected,
  onSelect,
}: {
  format:   string;
  price:    number;
  selected: boolean;
  onSelect: () => void;
}) {
  const meta = FORMAT_META[format] ?? { label: format, icon: BookOpen, description: "", maxQty: 99 };
  const Icon = meta.icon;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full flex items-center justify-between p-5 border-2 transition-all text-left",
        selected
          ? "bg-black text-white border-black translate-x-1 -translate-y-1 shadow-[4px_4px_0px_0px_rgba(255,183,3,1)]"
          : "bg-white border-black hover:bg-gray-50"
      )}
    >
      <div className="flex items-center gap-4">
        <div className={cn(
          "w-10 h-10 flex items-center justify-center border-2 shrink-0",
          selected ? "border-white/30 bg-white/10" : "border-black bg-gray-50"
        )}>
          <Icon size={18} className={selected ? "text-accent" : "text-black"} />
        </div>
        <div>
          <p className="font-black uppercase text-sm tracking-widest">{meta.label}</p>
          <p className={cn("text-[10px] font-medium mt-0.5", selected ? "text-white/60" : "text-gray-400")}>
            {meta.description}
            {format === "ebook" && (
              <span className={cn("ml-2 font-black uppercase tracking-widest text-[9px]", selected ? "text-accent" : "text-accent")}>
                · Max 1 copy
              </span>
            )}
          </p>
        </div>
      </div>
      <div className="text-right shrink-0 ml-4">
        <p className="font-black text-lg italic">₦{price.toLocaleString()}</p>
        {selected && (
          <p className="text-[9px] font-black uppercase tracking-widest text-accent mt-0.5">Selected</p>
        )}
      </div>
    </button>
  );
}

// ─── QuantitySelector (module level) ─────────────────────────────────────────

function QuantitySelector({
  value,
  onChange,
  maxQty,
}: {
  value:    number;
  onChange: (n: number) => void;
  maxQty:   number;
}) {
  const isEbook = maxQty === 1;

  if (isEbook) {
    // For ebooks: show a locked indicator instead of a stepper
    return (
      <div className="flex items-center border-4 border-black bg-black text-white h-16 px-5 gap-3 shrink-0">
        <Download size={16} className="text-accent" />
        <span className="font-black text-sm uppercase tracking-widest">1 Copy</span>
        <span className="text-[9px] font-bold uppercase tracking-widest opacity-40 ml-1">(digital)</span>
      </div>
    );
  }

  return (
    <div className="flex items-center border-4 border-black bg-white shrink-0">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={value <= 1}
        className="px-5 py-4 font-black text-xl hover:bg-gray-100 border-r-4 border-black disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="Decrease quantity"
      >
        <Minus size={18} />
      </button>
      <span className="px-6 font-black text-xl min-w-[3rem] text-center">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(maxQty, value + 1))}
        disabled={value >= maxQty}
        className="px-5 py-4 font-black text-xl hover:bg-gray-100 border-l-4 border-black disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="Increase quantity"
      >
        <Plus size={18} />
      </button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ProductDetails() {
  const params  = useParams();
  const id      = params?.id as string;
  const { toast } = useToast();
  const utils   = trpc.useUtils();
  const { data: session } = useSession();
  const openCart = useCartStore(state => state.openCart);

  const { data: book,    isLoading: bookLoading }    = trpc.getBookById.useQuery({ id });
  const { data: reviews, isLoading: reviewsLoading } = trpc.getReviewsByBook.useQuery({ book_id: id });
  const createReviewMutation = trpc.createReview.useMutation();
  const addBookToCart        = trpc.createCart.useMutation();

  // ── Available formats — derived from actual variants only ─────────────────
  const availableFormats = useMemo(() => {
    if (!book?.variants) return [];
    return (["ebook", "paperback", "hardcover"] as const).filter(f =>
      book.variants!.some(v => v.format.toLowerCase() === f)
    );
  }, [book]);

  // ── State ──────────────────────────────────────────────────────────────────
  const [currentImage,   setCurrentImage]   = useState(0);
  const [selectedFormat, setSelectedFormat] = useState<string>("");
  const [quantity,       setQuantity]       = useState(1);
  const [reviewRating,   setReviewRating]   = useState(0);
  const [comment,        setComment]        = useState("");

  // Auto-select first available format when book loads
  useEffect(() => {
    if (availableFormats.length > 0 && !selectedFormat) {
      setSelectedFormat(availableFormats[0]);
    }
  }, [availableFormats, selectedFormat]);

  // When format changes, enforce qty cap
  useEffect(() => {
    const meta   = FORMAT_META[selectedFormat];
    const maxQty = meta?.maxQty ?? 99;
    if (quantity > maxQty) setQuantity(maxQty);
    // Ebooks always reset to 1
    if (selectedFormat === "ebook") setQuantity(1);
  }, [selectedFormat]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const images = [book?.book_cover, book?.book_cover2, book?.book_cover3, book?.book_cover4]
    .filter(Boolean) as string[];

  const getVariantPrice = (fmt: string): number => {
    const variant = book?.variants?.find(v => v.format.toLowerCase() === fmt.toLowerCase());
    return variant ? (variant.discount_price ?? variant.list_price) : (book?.price || 0);
  };

  const currentPrice  = getVariantPrice(selectedFormat);
  const currentMaxQty = FORMAT_META[selectedFormat]?.maxQty ?? 99;
  const totalPrice    = currentPrice * quantity;

  // ── Cart handler ───────────────────────────────────────────────────────────
  const handleAddToCart = async () => {
    if (!selectedFormat) {
      toast({ title: "Select a format", variant: "destructive", description: "Please choose a format before adding to bag." });
      return;
    }

    try {
      if (session?.user?.id) {
        await addBookToCart.mutateAsync({
          userId:     session.user.id,
          book_image: book?.book_cover as string,
          book_title: book?.title      as string,
          book_type:  selectedFormat,
          price:      currentPrice,
          quantity,
          total:      totalPrice,
        });
        utils.getCartsByUser.invalidate();
      } else {
        // Guest cart
        let cartItems: any[] = [];
        try {
          const stored = localStorage.getItem(GUEST_CART_KEY);
          cartItems = stored ? JSON.parse(stored) : [];
          if (!Array.isArray(cartItems)) cartItems = [];
        } catch { cartItems = []; }

        cartItems.push({
          id:         `${Date.now()}-${Math.random()}`,
          book_image: book?.book_cover as string,
          book_title: book?.title      as string,
          book_type:  selectedFormat,
          price:      currentPrice,
          quantity,
          total:      totalPrice,
        });

        localStorage.setItem(GUEST_CART_KEY, JSON.stringify(cartItems));
        notifyCartUpdate();
      }

      toast({ title: "Added to bag!", description: `${book?.title} · ${FORMAT_META[selectedFormat]?.label ?? selectedFormat}${quantity > 1 ? ` × ${quantity}` : ""}` });
      openCart();
    } catch (error: any) {
      toast({ title: "Error", variant: "destructive", description: error.message || "Could not add to cart." });
    }
  };

  // ── Review handler ─────────────────────────────────────────────────────────
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) {
      toast({ title: "Auth Required", variant: "destructive", description: "Please login to review." });
      return;
    }
    if (reviewRating === 0) {
      toast({ title: "Rating Required", variant: "destructive", description: "Please select a star rating." });
      return;
    }
    try {
      await createReviewMutation.mutateAsync({
        book_id: id,
        user_id: session.user.id,
        name:    `${session.user.first_name || "User"}`,
        email:   session.user.email ?? "",
        comment,
        rating:  reviewRating,
      });
      toast({ title: "Review submitted!" });
      utils.getReviewsByBook.invalidate();
      setComment("");
      setReviewRating(0);
    } catch {
      toast({ title: "Error", variant: "destructive", description: "Failed to submit review." });
    }
  };

  const averageRating = reviews?.length
    ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
    : 0;

  if (bookLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-black italic uppercase text-2xl animate-pulse">
        Loading Book<span className="text-accent">.</span>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#FCFAEE] pb-20">
      <main className="max-w-[95%] lg:max-w-[85%] mx-auto py-12 grid lg:grid-cols-2 gap-16 items-start">

        {/* ── Image gallery ─────────────────────────────────────────── */}
        <div className="lg:sticky lg:top-28 space-y-6">
          <div className="bg-white border-4 border-black gumroad-shadow aspect-[3/4] relative overflow-hidden">
            {images.length > 0 ? (
              <Image src={images[currentImage]} alt={book?.title ?? ""} fill className="object-cover" />
            ) : (
              <div className="flex items-center justify-center h-full bg-primary/5 font-black text-4xl italic text-primary/10">
                IWACUMÒ.
              </div>
            )}
          </div>

          {images.length > 1 && (
            <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImage(idx)}
                  className={cn(
                    "w-24 aspect-[3/4] border-2 transition-all relative shrink-0",
                    currentImage === idx ? "border-accent scale-105" : "border-black/10 opacity-60 hover:opacity-100"
                  )}
                >
                  <Image src={img} alt="Thumbnail" fill className="object-cover" />
                </button>
              ))}
            </div>
          )}

          <div className="bg-accent border-2 border-black p-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <p className="font-black uppercase text-[10px] tracking-widest">
              Verified Content · Secure Delivery
            </p>
          </div>
        </div>

        {/* ── Product info ──────────────────────────────────────────── */}
        <div className="space-y-10">

          {/* Title + meta */}
          <div className="space-y-4 border-b-4 border-black pb-8">
            <div className="flex flex-wrap gap-2">
              {book?.categories?.map(cat => (
                <span key={cat.id} className="bg-black text-white px-3 py-1 text-[10px] font-black uppercase italic">
                  {cat.name}
                </span>
              ))}
            </div>
            <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter leading-[0.85]">
              {book?.title}<span className="text-accent">.</span>
            </h1>
            <div className="flex items-center gap-4 flex-wrap">
              <p className="text-xl font-bold italic opacity-60">by {book?.author?.name}</p>
              {averageRating > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="flex text-accent">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} size={14} className={cn(s <= Math.round(averageRating) ? "fill-accent" : "text-black/10")} />
                    ))}
                  </div>
                  <span className="text-xs font-bold opacity-40">({reviews?.length})</span>
                </div>
              )}
            </div>
          </div>

          <p className="text-lg font-medium leading-relaxed text-gray-700">{book?.short_description}</p>

          {/* ── Format selector ─────────────────────────────────────── */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-400">
              Choose Format
            </h3>

            {availableFormats.length === 0 ? (
              <p className="text-sm font-bold opacity-40 italic">No formats available.</p>
            ) : (
              <div className="grid gap-3">
                {availableFormats.map(f => (
                  <FormatCard
                    key={f}
                    format={f}
                    price={getVariantPrice(f)}
                    selected={selectedFormat === f}
                    onSelect={() => setSelectedFormat(f)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── Quantity + Add to cart ───────────────────────────────── */}
          {selectedFormat && (
            <div className="space-y-4 pt-2">
              {/* Summary line above the CTA */}
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold opacity-50 uppercase text-xs tracking-widest">
                  {FORMAT_META[selectedFormat]?.label ?? selectedFormat}
                  {selectedFormat !== "ebook" && quantity > 1 && ` × ${quantity}`}
                </span>
                <span className="font-black text-2xl italic">
                  ₦{totalPrice.toLocaleString()}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <QuantitySelector
                  value={quantity}
                  onChange={setQuantity}
                  maxQty={currentMaxQty}
                />
                <Button
                  onClick={handleAddToCart}
                  disabled={addBookToCart.isPending || !selectedFormat}
                  className="flex-1 booka-button-primary h-16 text-base font-black uppercase italic tracking-widest group flex items-center justify-center gap-3"
                >
                  {addBookToCart.isPending ? "Adding…" : "Add to Bag"}
                  <ShoppingCart size={20} className="group-hover:rotate-12 transition-transform" />
                </Button>
              </div>

              {/* Ebook note */}
              {selectedFormat === "ebook" && (
                <p className="text-[10px] font-medium text-gray-400 flex items-center gap-1.5">
                  <Download size={10} />
                  Digital books are limited to one copy per purchase and are ready immediately after payment.
                </p>
              )}
            </div>
          )}
        </div>
      </main>

      {/* ── Description + Reviews ────────────────────────────────────── */}
      <section className="max-w-[95%] lg:max-w-[85%] mx-auto mt-20">
        <Tabs defaultValue="description" className="w-full">
          <TabsList className="bg-transparent border-b-4 border-black w-full justify-start h-auto p-0 gap-8">
            <TabsTrigger
              value="description"
              className="rounded-none border-b-4 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent px-0 py-4 font-black uppercase italic tracking-widest text-lg"
            >
              Description
            </TabsTrigger>
            <TabsTrigger
              value="reviews"
              className="rounded-none border-b-4 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent px-0 py-4 font-black uppercase italic tracking-widest text-lg"
            >
              Reviews ({reviews?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="description" className="pt-10 prose prose-lg max-w-none font-medium">
            <p className="whitespace-pre-wrap leading-loose">{book?.long_description || book?.description}</p>
          </TabsContent>

          <TabsContent value="reviews" className="pt-10 grid lg:grid-cols-2 gap-16">
            <div className="space-y-8">
              {reviewsLoading ? (
                <p className="italic font-bold animate-pulse">Loading reviews…</p>
              ) : reviews?.length === 0 ? (
                <p className="text-gray-400 font-bold uppercase italic">No reviews yet. Be the first.</p>
              ) : reviews?.map(r => (
                <div key={r.id} className="border-2 border-black p-6 bg-white gumroad-shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="font-black uppercase text-sm">{r.name}</p>
                      <p className="text-[10px] font-bold opacity-40 uppercase">{new Date(r.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex text-accent">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} size={12} className={cn(s <= r.rating ? "fill-accent" : "text-black/10")} />
                      ))}
                    </div>
                  </div>
                  <p className="font-medium text-gray-700 italic">"{r.comment}"</p>
                </div>
              ))}
            </div>

            {session ? (
              <div className="bg-primary text-white p-8 border-4 border-black gumroad-shadow">
                <h3 className="text-2xl font-black uppercase italic mb-6">Leave a Review</h3>
                <form onSubmit={handleReviewSubmit} className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black uppercase mb-2 tracking-widest">Your Rating</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map(s => (
                        <button key={s} type="button" onClick={() => setReviewRating(s)} className="transition-transform hover:scale-125">
                          <Star size={24} className={cn(s <= reviewRating ? "fill-accent text-accent" : "text-white/20")} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase mb-2 tracking-widest">Comment</label>
                    <Textarea
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                      placeholder="What did you think of the story?"
                      className="bg-white text-black border-2 border-black rounded-none min-h-[120px]"
                    />
                  </div>
                  <Button type="submit" className="w-full booka-button-primary h-14" disabled={createReviewMutation.isPending}>
                    {createReviewMutation.isPending ? "Submitting…" : "Post Review"}
                  </Button>
                </form>
              </div>
            ) : (
              <div className="bg-white border-4 border-black p-8 gumroad-shadow flex flex-col items-center justify-center text-center space-y-4">
                <div className="bg-accent p-4 rounded-full border-2 border-black">
                  <Star className="h-8 w-8 fill-black" />
                </div>
                <h3 className="text-xl font-black uppercase italic">Want to leave a review?</h3>
                <p className="font-bold text-sm opacity-60 uppercase">You must be logged in to share your thoughts.</p>
                <Link href="/login" className="w-full">
                  <Button className="w-full booka-button-primary h-12">Login to Review</Button>
                </Link>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}