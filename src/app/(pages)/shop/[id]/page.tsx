"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft, ChevronRight, ShoppingCart, Star, BookOpen, Truck, CheckCircle2 } from "lucide-react";
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

export default function ProductDetails() {
  const params = useParams();
  const id = params?.id as string;
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { data: session } = useSession();

  const openCart = useCartStore((state) => state.openCart);

  // Queries & Mutations
  const { data: book, isLoading: bookLoading } = trpc.getBookById.useQuery({ id });
  const { data: reviews, isLoading: reviewsLoading } = trpc.getReviewsByBook.useQuery({ book_id: id });
  const createReviewMutation = trpc.createReview.useMutation();
  const addBookToCart = trpc.createCart.useMutation();

  // Component State
  const [currentImage, setCurrentImage] = useState(0);
  const [selectedFormat, setSelectedFormat] = useState("ebook");
  const [quantity, setQuantity] = useState(1);
  const [reviewRating, setReviewRating] = useState(0);
  const [comment, setComment] = useState("");

  // Helper: Filter valid images
  const images = [
    book?.book_cover,
    book?.book_cover2,
    book?.book_cover3,
    book?.book_cover4,
  ].filter(Boolean) as string[];

  // Logic: Get price for specific format
  const getVariantPrice = (formatType: string): number => {
    const variant = book?.variants?.find(
      (v) => v.format.toLowerCase() === formatType.toLowerCase()
    );
    return variant ? (variant.discount_price ?? variant.list_price) : (book?.price || 0);
  };

  const currentPrice = getVariantPrice(selectedFormat);

  // Cart Handler
  const handleAddToCart = async () => {
    try {
      const totalPrice = currentPrice * quantity;

      if (session?.user?.id) {
        // AUTHENTICATED LOGIC
        await addBookToCart.mutateAsync({
          userId: session.user.id,
          book_image: book?.book_cover as string,
          book_title: book?.title as string,
          book_type: selectedFormat,
          price: currentPrice,
          quantity: quantity,
          total: totalPrice,
        });
        utils.getCartsByUser.invalidate();
      } else {
        // GUEST LOGIC 
        const existingCart = localStorage.getItem(GUEST_CART_KEY);
        // const cartItems = existingCart ? JSON.parse(existingCart) : [];
        let cartItems = [];
          try {
            cartItems = existingCart ? JSON.parse(existingCart) : [];
            if (!Array.isArray(cartItems)) cartItems = []; // Ensure it's always an array
          } catch (e) {
            cartItems = [];
          }
        
        const newItem = {
          id: `${Date.now()}-${Math.random()}`,
          book_image: book?.book_cover as string,
          book_title: book?.title as string,
          book_type: selectedFormat,
          price: currentPrice,
          quantity: quantity,
          total: totalPrice,
        };

        cartItems.push(newItem);
        localStorage.setItem(GUEST_CART_KEY, JSON.stringify(cartItems));
        
        // CRITICAL: Tell the CartDrawer to refresh its data
        notifyCartUpdate(); 
      }

      toast({ title: "Success", description: "Added to bag" });
      // Open the drawer so the user sees the update immediately
      openCart(); 

    } catch (error: any) {
      console.error("Cart Error:", error); // Check your browser inspect console!
      toast({ 
        title: "Error", 
        variant: "destructive", 
        description: error.message || "Could not add to cart." 
      });
    }
  };

  // Review Handler
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
        name: `${session.user.first_name || 'User'}`,
        email: session.user.email ?? "",
        comment,
        rating: reviewRating,
      });

      toast({ title: "Success", description: "Review submitted!" });
      utils.getReviewsByBook.invalidate();
      setComment("");
      setReviewRating(0);
    } catch (error) {
      toast({ title: "Error", variant: "destructive", description: "Failed to submit review." });
    }
  };

  const averageRating = reviews?.length 
    ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length 
    : 0;

  if (bookLoading) return <div className="min-h-screen flex items-center justify-center font-black italic uppercase">Loading Book...</div>;

  return (
    <div className="min-h-screen bg-[#FCFAEE] pb-20">
      <main className="max-w-[95%] lg:max-w-[85%] mx-auto py-12 grid lg:grid-cols-2 gap-16 items-start">
        
        {/* IMAGE GALLERY */}
        <div className="lg:sticky lg:top-28 space-y-6">
          <div className="bg-white border-4 border-black gumroad-shadow aspect-[3/4] relative overflow-hidden">
            {images.length > 0 ? (
              <Image src={images[currentImage]} alt={book?.title ?? ""} fill className="object-cover" />
            ) : (
              <div className="flex items-center justify-center h-full bg-primary/5 font-black text-4xl italic text-primary/10">BOOKA.</div>
            )}
          </div>
          
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

          <div className="bg-accent border-2 border-black p-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5" />
            <p className="font-black uppercase text-[10px] tracking-widest">Verified Content • Secure Delivery</p>
          </div>
        </div>

        {/* PRODUCT INFO */}
        <div className="space-y-10">
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
            <div className="flex items-center gap-4">
              <p className="text-xl font-bold italic opacity-60">by {book?.author?.name}</p>
              <div className="flex text-accent">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} size={16} className={cn(s <= Math.round(averageRating) ? "fill-accent" : "text-black/10")} />
                ))}
              </div>
            </div>
          </div>

          <p className="text-lg font-medium leading-relaxed text-gray-700">{book?.short_description}</p>

          {/* FORMAT SELECTOR */}
          <div className="space-y-6">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Choose Format</h3>
            <div className="grid gap-3">
              {["ebook", "paperback", "hardcover"].map((f) => {
                const isAvail = book?.variants?.some(v => v.format.toLowerCase() === f);
                if (!isAvail && f !== 'paperback') return null; // Logic check
                
                return (
                  <button
                    key={f}
                    onClick={() => setSelectedFormat(f)}
                    className={cn(
                      "flex items-center justify-between p-6 border-2 transition-all",
                      selectedFormat === f 
                        ? "bg-primary text-white border-black translate-x-1 -translate-y-1 shadow-[4px_4px_0px_0px_rgba(255,183,3,1)]" 
                        : "bg-white border-black hover:bg-gray-50"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      {f === 'ebook' ? <BookOpen /> : <Truck />}
                      <span className="font-black uppercase text-sm tracking-widest">{f}</span>
                    </div>
                    <span className="font-black text-lg italic">₦{getVariantPrice(f).toLocaleString()}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* QUANTITY & CART */}
          <div className="flex flex-col sm:flex-row gap-4 pt-6">
            <div className="flex items-center border-4 border-black bg-white">
              <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="px-6 py-4 font-black text-xl hover:bg-gray-100 border-r-4 border-black">-</button>
              <span className="px-8 font-black text-xl">{quantity}</span>
              <button onClick={() => setQuantity(q => q + 1)} className="px-6 py-4 font-black text-xl hover:bg-gray-100 border-l-4 border-black">+</button>
            </div>
            <Button 
              onClick={handleAddToCart}
              className="flex-1 booka-button-primary h-auto py-6 text-xl group"
            >
              Add to Bag — ₦{(currentPrice * quantity).toLocaleString()}
              <ShoppingCart className="ml-4 group-hover:rotate-12 transition-transform" />
            </Button>
          </div>
        </div>
      </main>

      {/* TABS: DESCRIPTION & REVIEWS */}
      <section className="max-w-[95%] lg:max-w-[85%] mx-auto mt-20">
        <Tabs defaultValue="description" className="w-full">
          <TabsList className="bg-transparent border-b-4 border-black w-full justify-start h-auto p-0 gap-8">
            <TabsTrigger value="description" className="rounded-none border-b-4 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent px-0 py-4 font-black uppercase italic tracking-widest text-lg">Description</TabsTrigger>
            <TabsTrigger value="reviews" className="rounded-none border-b-4 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent px-0 py-4 font-black uppercase italic tracking-widest text-lg">Reviews ({reviews?.length || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="description" className="pt-10 prose prose-lg max-w-none font-medium">
            <p className="whitespace-pre-wrap leading-loose">{book?.long_description || book?.description}</p>
          </TabsContent>

          <TabsContent value="reviews" className="pt-10 grid lg:grid-cols-2 gap-16">
            {/* Review List */}
            <div className="space-y-8">
              {reviewsLoading ? <p className="italic font-bold">Loading reviews...</p> : 
               reviews?.length === 0 ? <p className="text-gray-400 font-bold uppercase italic">No reviews yet. Be the first.</p> :
               reviews?.map((r) => (
                <div key={r.id} className="border-2 border-black p-6 bg-white gumroad-shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="font-black uppercase text-sm">{r.name}</p>
                      <p className="text-[10px] font-bold opacity-40 uppercase">{new Date(r.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex text-accent">
                      {[1, 2, 3, 4, 5].map(s => <Star key={s} size={12} className={cn(s <= r.rating ? "fill-accent" : "text-black/10")} />)}
                    </div>
                  </div>
                  <p className="font-medium text-gray-700 italic">"{r.comment}"</p>
                </div>
              ))}
            </div>

            {/* Review Form */}
            {session ? (
            <div className="bg-primary text-white p-8 border-4 border-black gumroad-shadow">
              <h3 className="text-2xl font-black uppercase italic mb-6">Leave a Review</h3>
              <form onSubmit={handleReviewSubmit} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black uppercase mb-2 tracking-widest">Your Rating</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((s) => (
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
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="What did you think of the story?" 
                    className="bg-white text-black border-2 border-black rounded-none min-h-[120px]"
                  />
                </div>
                <Button type="submit" className="w-full booka-button-primary h-14" disabled={createReviewMutation.isPending}>
                  {createReviewMutation.isPending ? "Submitting..." : "Post Review"}
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