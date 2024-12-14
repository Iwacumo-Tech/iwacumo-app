import { Card } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import { trpc } from "@/app/_providers/trpc-provider";

export default function Authors() {
  const { data: authors } = trpc.getAllAuthors.useQuery();

  //     {
  //       name: "Peter Cawdron",
  //       books: 2,
  //       image: "/placeholder.svg?height=400&width=400",
  //       slug: "peter-cawdron",
  //     },
  //     {
  //       name: "Matthew Mather",
  //       books: 1,
  //       image: "/placeholder.svg?height=400&width=400",
  //       slug: "matthew-mather",
  //     },
  //     {
  //       name: "David J. Schmidt",
  //       books: 1,
  //       image: "/placeholder.svg?height=400&width=400",
  //       slug: "david-schmidt",
  //     },
  //     {
  //       name: "George McKay",
  //       books: 1,
  //       image: "/placeholder.svg?height=400&width=400",
  //       slug: "george-mckay",
  //     },
  //     {
  //       name: "Gordon Hayward & Mary Hayward",
  //       books: 1,
  //       image: "/placeholder.svg?height=400&width=400",
  //       slug: "gordon-mary-hayward",
  //     },
  //   ];

  return (
    <section className="w-full py-12">
      <div className="container px-4">
        <div className="flex items-center justify-between mb-8">
          <div className="w-full flex items-center">
            <div className="flex-grow h-px bg-border"></div>
            <h2 className="text-2xl font-semibold text-foreground px-4 text-center">
              FEATURED AUTHORS
            </h2>
            <div className="flex-grow h-px bg-border"></div>
          </div>
          <Link
            href="/authors"
            className="text-primary hover:underline whitespace-nowrap ml-4"
          >
            View all Authors →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {authors &&
            authors?.map((author) => (
              <Card key={author.slug} className="group overflow-hidden">
                <Link href="#">
                  <div className="relative aspect-square">
                    <Image
                      src={(author.profile_picture as string) || "/boy.svg"}
                      alt="author"
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/0" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h3 className="font-semibold text-white text-lg leading-tight mb-1">
                        {author.name}
                      </h3>
                      {/* <p className="text-white/80 text-sm">
                      {author.books} {author.books === 1 ? "book" : "books"}
                    </p> */}
                    </div>
                  </div>
                </Link>
              </Card>
            ))}
        </div>
      </div>
    </section>
  );
}
