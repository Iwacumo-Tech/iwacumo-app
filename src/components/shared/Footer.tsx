import Image from "next/image";
import Link from "next/link";
import { Facebook, Instagram, Twitter } from "lucide-react";

export default function Footer() {
  const recentPosts = [
    {
      title: "10 Ways You Might Be Reading Your Book Wrong",
      date: "Aug 07,2017",
      image: "/placeholder.svg?height=80&width=80",
      slug: "reading-wrong",
    },
    {
      title: "The World of Abstract Art Explained",
      date: "Aug 07,2017",
      image: "/placeholder.svg?height=80&width=80",
      slug: "abstract-art",
    },
    {
      title: "Why Are Books Made From Paper?",
      date: "Aug 07,2017",
      image: "/placeholder.svg?height=80&width=80",
      slug: "books-paper",
    },
  ];

  const genres = [
    "Action",
    "Comedy",
    "Drama",
    "E-Books",
    "Horror",
    "Kids",
    "Romantic Comedy",
    "Sci-Fi",
  ];

  return (
    <footer className="w-full bg-white">
      <div className="container px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center space-x-2">
              <div>
                <h2 className="text-2xl font-bold text-[#8257F6]">Booka</h2>
                <p className="text-sm text-muted-foreground">
                  Book Store & Reviews
                </p>
              </div>
            </Link>
            <p className="text-muted-foreground">
              Suspendisse potenti. Nulla facilisi. Vestibulum non blandit nulla.
              Vivamus id orci condimentum, suscipit nunc non, viverra justo.
              Phasellus sit amet justo ac felis sagittis elementum a at dui.
            </p>
            <div className="flex space-x-4">
              <Link
                href="#"
                className="text-muted-foreground hover:text-[#8257F6]"
              >
                <Facebook className="h-5 w-5" />
                <span className="sr-only">Facebook</span>
              </Link>
              <Link
                href="#"
                className="text-muted-foreground hover:text-[#8257F6]"
              >
                <Instagram className="h-5 w-5" />
                <span className="sr-only">Instagram</span>
              </Link>
              <Link
                href="#"
                className="text-muted-foreground hover:text-[#8257F6]"
              >
                <Twitter className="h-5 w-5" />
                <span className="sr-only">Twitter</span>
              </Link>
            </div>
          </div>

          {/* Recent Posts */}
          <div>
            <h3 className="font-bold text-lg mb-4">RECENT POSTS</h3>
            <div className="space-y-4">
              {recentPosts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="flex items-center space-x-4 group"
                >
                  <Image
                    src={post.image}
                    alt={post.title}
                    width={80}
                    height={80}
                    className="rounded-md"
                  />
                  <div>
                    <h4 className="font-medium group-hover:text-[#8257F6] transition-colors">
                      {post.title}
                    </h4>
                    <p className="text-sm text-muted-foreground">{post.date}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Genres */}
          <div>
            <h3 className="font-bold text-lg mb-4">GENRES</h3>
            <ul className="space-y-2">
              {genres.map((genre) => (
                <li key={genre}>
                  <Link
                    href={`/genres/${genre.toLowerCase()}`}
                    className="text-muted-foreground hover:text-[#8257F6] transition-colors"
                  >
                    {genre}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-bold text-lg mb-4">CONTACT</h3>
            <div className="space-y-2 text-muted-foreground">
              <p className="font-medium text-foreground">Booka,</p>
              <p>80 Crown Street,</p>
              <p>London, WC2B 7UJ</p>
              <div className="pt-4">
                <p>Call: 0772 410 0110</p>
                <p>Email: email@booka.co.uk</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t">
        <div className="container px-4 py-4 text-center text-sm text-muted-foreground">
          Copyright © 2024{" "}
          <Link href="#" className="text-[#8257F6] hover:underline">
            Booka
          </Link>
          . All Right Reserved
        </div>
      </div>
    </footer>
  );
}
