import Link from "next/link";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";

export default function Categories() {
  return (
    <section className="max-w-[1200px] mx-auto px-4 mt-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center flex-1">
          <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-gray-200 to-gray-200" />
          <h2 className="text-base font-medium text-gray-500 px-8">
            POPULAR CATEGORIES
          </h2>
          <div className="h-[1px] flex-1 bg-gradient-to-r from-gray-200 to-transparent" />
        </div>
        <Link
          href="/categories"
          className="text-[#8b5cf6] hover:text-[#7c3aed] flex items-center gap-1 font-medium whitespace-nowrap ml-4"
        >
          All Categories
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/categories/thriller">
          <Card className="h-full overflow-hidden bg-[#4c2a85] hover:opacity-90 transition-opacity rounded-lg">
            <div className="p-5 text-white h-full">
              <h3 className="text-2xl font-bold mb-1">THRILLER</h3>
              <p className="text-sm mb-4 text-white/80 font-medium">
                Edge of your seat type and more
              </p>
              <div className="flex gap-1">
                <Image
                  src="/book.jpeg"
                  alt="Thriller book cover 1"
                  width={80}
                  height={120}
                  className="object-cover rounded-sm"
                />
                <Image
                  src="/book.jpeg"
                  alt="Thriller book cover 2"
                  width={80}
                  height={120}
                  className="object-cover rounded-sm"
                />
                <Image
                  src="/book.jpeg"
                  alt="Thriller book cover 3"
                  width={80}
                  height={120}
                  className="object-cover rounded-sm"
                />
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/categories/romance">
          <Card className="h-full overflow-hidden bg-[#e63946] hover:opacity-90 transition-opacity rounded-lg">
            <div className="p-5 text-white h-full">
              <h3 className="text-2xl font-bold mb-1">ROMANCE</h3>
              <p className="text-sm mb-4 text-white/80 font-medium">
                Fall in love with a book today
              </p>
              <div className="flex gap-1">
                <Image
                  src="/book.jpeg"
                  alt="Romance book cover 1"
                  width={80}
                  height={120}
                  className="object-cover rounded-sm"
                />
                <Image
                  src="/book.jpeg"
                  alt="Romance book cover 2"
                  width={80}
                  height={120}
                  className="object-cover rounded-sm"
                />
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/categories/childrens">
          <Card className="h-full overflow-hidden bg-[#00b4d8] hover:opacity-90 transition-opacity rounded-lg">
            <div className="p-5 text-white h-full">
              <h3 className="text-2xl font-bold mb-1">CHILDRENS</h3>
              <p className="text-sm mb-4 text-white/80 font-medium">
                Amazing stories for kids
              </p>
              <div className="flex gap-1">
                <Image
                  src="/book.jpeg"
                  alt="Children's book cover 1"
                  width={80}
                  height={120}
                  className="object-cover rounded-sm"
                />
                <Image
                  src="/book.jpeg"
                  alt="Children's book cover 2"
                  width={80}
                  height={120}
                  className="object-cover rounded-sm"
                />
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/categories/media">
          <Card className="h-full overflow-hidden bg-[#7209b7] hover:opacity-90 transition-opacity rounded-lg">
            <div className="p-5 text-white h-full">
              <h3 className="text-2xl font-bold mb-1">MEDIA</h3>
              <p className="text-sm mb-4 text-white/80 font-medium">
                Books for media and entertainment
              </p>
              <div className="flex gap-1">
                <Image
                  src="/book.jpeg"
                  alt="Media book cover 1"
                  width={80}
                  height={120}
                  className="object-cover rounded-sm"
                />
                <Image
                  src="/book.jpeg"
                  alt="Media book cover 2"
                  width={80}
                  height={120}
                  className="object-cover rounded-sm"
                />
                <Image
                  src="/book.jpeg"
                  alt="Media book cover 3"
                  width={80}
                  height={120}
                  className="object-cover rounded-sm"
                />
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/categories/comedy" className="sm:col-span-2">
          <Card className="h-full overflow-hidden bg-[#3a0ca3] hover:opacity-90 transition-opacity rounded-lg">
            <div className="p-5 text-white h-full">
              <h3 className="text-2xl font-bold mb-1">COMEDY</h3>
              <p className="text-sm mb-4 text-white/80 font-medium">
                Comedy category books
              </p>
              <div className="flex gap-1">
                <Image
                  src="/book.jpeg"
                  alt="Comedy book cover 1"
                  width={80}
                  height={120}
                  className="object-cover rounded-sm"
                />
                <Image
                  src="/book.jpeg"
                  alt="Comedy book cover 2"
                  width={80}
                  height={120}
                  className="object-cover rounded-sm"
                />
                <Image
                  src="/book.jpeg"
                  alt="Comedy book cover 3"
                  width={80}
                  height={120}
                  className="object-cover rounded-sm"
                />
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/categories/cooking" className="sm:col-span-1">
          <Card className="h-full overflow-hidden bg-[#ffd60a] hover:opacity-90 transition-opacity rounded-lg">
            <div className="p-5 text-black h-full">
              <h3 className="text-2xl font-bold mb-1">COOKING</h3>
              <p className="text-sm mb-4 text-black/70 font-medium">
                Learn to cook & make drinks
              </p>
              <div className="flex gap-1">
                <Image
                  src="/book.jpeg"
                  alt="Cooking book cover 1"
                  width={80}
                  height={120}
                  className="object-cover rounded-sm"
                />
                <Image
                  src="/book.jpeg"
                  alt="Cooking book cover 2"
                  width={80}
                  height={120}
                  className="object-cover rounded-sm"
                />
                <Image
                  src="/book.jpeg"
                  alt="Cooking book cover 3"
                  width={80}
                  height={120}
                  className="object-cover rounded-sm"
                />
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/categories/comic" className="sm:col-span-1">
          <Card className="h-full overflow-hidden bg-[#4361ee] hover:opacity-90 transition-opacity rounded-lg">
            <div className="p-5 text-white h-full">
              <h3 className="text-2xl font-bold mb-1">COMIC</h3>
              <p className="text-sm mb-4 text-white/80 font-medium">
                Comic book store categories
              </p>
              <div className="flex gap-1">
                <Image
                  src="/book.jpeg"
                  alt="Comic book cover 1"
                  width={80}
                  height={120}
                  className="object-cover rounded-sm"
                />
                <Image
                  src="/book.jpeg"
                  alt="Comic book cover 2"
                  width={80}
                  height={120}
                  className="object-cover rounded-sm"
                />
                <Image
                  src="/book.jpeg"
                  alt="Comic book cover 3"
                  width={80}
                  height={120}
                  className="object-cover rounded-sm"
                />
              </div>
            </div>
          </Card>
        </Link>
      </div>
    </section>
  );
}
