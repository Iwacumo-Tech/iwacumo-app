"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Heart, Scale, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useSession } from "next-auth/react";

import { cn } from "@/lib/utils";
import { trpc } from "@/app/_providers/trpc-provider";
import { useToast } from "@/components/ui/use-toast";

export default function ProductDetails() {
  const [quantity, setQuantity] = useState(1);
  const [currentImage, setCurrentImage] = useState(0);
  const [format, setFormat] = useState("paperback");
  const [rating, setRating] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [comment, setComment] = useState("");
  const params = useParams();
  const id = params?.id as string;
  const { data: book } = trpc.getBookById.useQuery({ id: id });
  const session = useSession();
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const createReviewMutation = trpc.createReview.useMutation();
  const bookreview = trpc.getReviewsByBook.useQuery({
    book_id: book?.id as string,
  });

  const images = [
    book?.book_cover || "/bookcover.png",
    book?.book_cover2 || "/bookcover.png",
    book?.book_cover3 || "/bookcover.png",
    book?.book_cover4 || "/bookcover.png",
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // // Validate the form
    // if (!name || !email || !comment || !rating) {
    //   alert("All fields and a rating are required.");
    //   return;
    // }

    if (!session) {
      toast({
        title: "Error",
        variant: "destructive",
        description: "You need to login to add a review",
      });
      return;
    }

    try {
      // Send the review data to the server
      await createReviewMutation.mutateAsync({
        book_id: book?.id as string,
        user_id: session.data?.user.id as string,
        name,
        email,
        comment,
        rating,
      });

      toast({
        title: "Success",
        variant: "default",
        description: "Review Added Sucessfully",
      });
      utils.getReviewsByBook.invalidate();
      setName("");
      setEmail("");
      setComment("");
      setRating(0); // Reset the rating
    } catch (error) {
      console.error("Failed to submit review:", error);
      toast({
        title: "Error",
        variant: "destructive",
        description: "Error adding the review",
      });
    }
  };

  const averageRating = bookreview.data
    ? bookreview.data.reduce((acc, review) => acc + review.rating, 0) /
      bookreview.data.length
    : 0;

  return (
    <div className="container mx-auto px-4 py-8 w-[80%]">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Product Images */}
        <div className="space-y-4">
          <div className="relative aspect-[4/5] bg-gray-100">
            <Image
              src={images[currentImage]}
              alt="Product"
              fill
              className="object-cover"
            />
          </div>
          <div className="relative">
            <button
              onClick={() => setCurrentImage((prev) => Math.max(0, prev - 1))}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-1 shadow-md"
              disabled={currentImage === 0}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex gap-4 overflow-x-auto px-8">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImage(idx)}
                  className={cn(
                    "relative w-24 aspect-[4/5] flex-shrink-0",
                    currentImage === idx && "ring-2 ring-[#82d236]"
                  )}
                >
                  <Image
                    src={img}
                    alt={`Product ${idx + 1}`}
                    fill
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
            <button
              onClick={() =>
                setCurrentImage((prev) => Math.min(images.length - 1, prev + 1))
              }
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-1 shadow-md"
              disabled={currentImage === images.length - 1}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          <div>
            <div className="mb-4">
              <span className="text-sm text-gray-500">Tags: </span>
              {book?.tags.map((tag, index) => (
                <>
                  <Link
                    href="#"
                    className="text-sm text-gray-500 hover:text-[#82d236]"
                  >
                    {tag}
                  </Link>
                  {index < book.tags.length - 1 && <span> , </span>}
                </>
              ))}
            </div>
            <h1 className="text-2xl font-bold mb-4">{book?.title}</h1>
            <RadioGroup
              defaultValue="paperback"
              value={format}
              onValueChange={setFormat}
              className="flex flex-wrap gap-2 mb-4"
            >
              {book?.paper_back && (
                <div>
                  <RadioGroupItem
                    value="paperback"
                    id="paperback"
                    className="peer hidden"
                  />
                  <Label
                    htmlFor="paperback"
                    className={cn(
                      "px-4 py-2 rounded-full cursor-pointer border transition-colors",
                      "hover:border-[#82d236] hover:text-[#82d236]",
                      "peer-checked:bg-[#82d236] peer-checked:text-white peer-checked:border-[#82d236]"
                    )}
                  >
                    Paper-back
                  </Label>
                </div>
              )}
              {book?.e_copy && (
                <div>
                  <RadioGroupItem
                    value="ecopy"
                    id="ecopy"
                    className="peer hidden"
                  />
                  <Label
                    htmlFor="ecopy"
                    className={cn(
                      "px-4 py-2 rounded-full cursor-pointer border transition-colors",
                      "hover:border-[#82d236] hover:text-[#82d236]",
                      "peer-checked:bg-[#82d236] peer-checked:text-white peer-checked:border-[#82d236]"
                    )}
                  >
                    E-copy
                  </Label>
                </div>
              )}
              {book?.hard_cover && (
                <div>
                  <RadioGroupItem
                    value="hardcover"
                    id="hardcover"
                    className="peer hidden"
                  />
                  <Label
                    htmlFor="hardcover"
                    className={cn(
                      "px-4 py-2 rounded-full cursor-pointer border transition-colors",
                      "hover:border-[#82d236] hover:text-[#82d236]",
                      "peer-checked:bg-[#82d236] peer-checked:text-white peer-checked:border-[#82d236]"
                    )}
                  >
                    Hard-cover
                  </Label>
                </div>
              )}
            </RadioGroup>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star, i) => (
                  <Star
                    key={i}
                    className={`h-5 w-5 ${
                      star <= Math.round(averageRating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm">Ex Tax:</span>
              <span className="text-[#82d236]">£60.24</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">Brands:</span>
              <Link href="#" className="text-[#82d236] hover:underline">
                Canon
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">Product Code:</span>
              <span>model1</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">Reward Points:</span>
              <span>200</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">Availability:</span>
              <span className="text-[#82d236]">In Stock</span>
            </div>
          </div> */}

          <div className="flex items-center gap-4">
            <span className="text-3xl font-bold text-[#82d236]">
              ₦ {book?.price}
            </span>
          </div>

          <p className="text-gray-600">{book?.short_description}</p>

          <div className="flex items-center gap-4">
            {/* <div className="flex items-center">
              <span className="mr-4">Qty</span>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value))}
                className="w-20"
              />
            </div> */}
            <Button className="bg-[#82d236] hover:bg-[#72bc2d]">
              + Add To Cart
            </Button>
          </div>
        </div>
      </div>
      <Tabs defaultValue="description" className="w-full">
        <TabsList className="w-full h-auto flex bg-transparent border-b">
          <TabsTrigger
            value="description"
            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-[#82d236] data-[state=active]:text-[#82d236]"
          >
            DESCRIPTION
          </TabsTrigger>
          <TabsTrigger
            value="reviews"
            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-[#82d236] data-[state=active]:text-[#82d236]"
          >
            REVIEWS {bookreview.data && `(${bookreview.data.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="description" className="pt-6">
          <p className="text-gray-600 leading-relaxed">
            {book?.long_description}
          </p>
        </TabsContent>

        <TabsContent value="reviews" className="pt-6">
          <div className="space-y-8">
            {/* Existing Review */}
            <div>
              {/* Existing Reviews */}
              {bookreview.isLoading ? (
                <p>Loading reviews...</p>
              ) : bookreview.isError ? (
                <p>Error fetching reviews. Please try again later.</p>
              ) : bookreview.data && bookreview.data.length > 0 ? (
                bookreview.data.map((review) => (
                  <div key={review.id} className="mt-2">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-xl font-bold text-gray-400">
                        {review?.user?.first_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-4 w-4 ${
                                  star <= review.rating
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="text-sm text-gray-500 mb-2">
                          {review?.user?.first_name} -{" "}
                          {new Date(review.created_at).toLocaleDateString()}
                        </div>
                        <p className="text-gray-600">{review.comment}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p>No reviews yet. Be the first to review this product!</p>
              )}
            </div>

            {/* Add Review Form */}
            <div>
              <h3 className="font-medium mb-4">ADD A REVIEW</h3>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-sm mb-2">Your Rating</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="focus:outline-none"
                      >
                        <Star
                          className={`h-5 w-5 ${
                            star <= rating
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm mb-2">Comment</label>
                  <Textarea
                    className="min-h-[120px] bg-gray-50"
                    placeholder="Write your review here..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm mb-2">Name *</label>
                    <Input
                      className="bg-gray-50"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2">Email *</label>
                    <Input
                      className="bg-gray-50"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <Button
                  className="bg-gray-900 hover:bg-gray-800"
                  type="submit"
                  disabled={createReviewMutation.isPending}
                >
                  {createReviewMutation.isPending
                    ? "Submitting..."
                    : "ADD REVIEW"}
                </Button>
              </form>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
