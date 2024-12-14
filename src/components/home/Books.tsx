import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import Image from "next/image";
import { trpc } from "@/app/_providers/trpc-provider";

export default function Books() {
  const { data: books } = trpc.getAllBooks.useQuery();

  return (
    <section className="w-full py-12">
      <div className="container">
        <div className="flex items-center justify-between mb-8">
          <div className="w-full flex items-center">
            <div className="flex-grow h-px bg-border"></div>
            <h2 className="text-2xl font-semibold text-foreground px-4 text-center">
              THIS MONTHS BEST SELLERS
            </h2>
            <div className="flex-grow h-px bg-border"></div>
          </div>
          <Link
            href="/best-sellers"
            className="text-primary hover:underline whitespace-nowrap ml-4"
          >
            All Best Sellers →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {books?.map((book) => (
            <Card key={book.slug} className="overflow-hidden">
              <Link href={`/books/${book.slug}`}>
                <div className="aspect-[3/4] relative">
                  <Image
                    src={book.book_cover as string}
                    alt={`Cover of ${book.title}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold leading-tight mb-1 line-clamp-2">
                    {book.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    by: {book.author?.name}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-primary font-semibold">
                      ${book.price.toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
