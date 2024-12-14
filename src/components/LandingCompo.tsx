import { Author, Book, Chapter, Publisher, User } from "@prisma/client";
import Image from "next/image";
import { useRef } from "react";

interface HomeProps {
  books: (Book & {author: Author | null; chapters: Chapter[]}) [] | undefined;
  authors: Author & {user: User; publisher: Publisher | null; books: Book[]};
}

export default function Home2 ({ authors, books }: HomeProps) {
  const booksRef = useRef<HTMLDivElement>(null);
  const aboutRef = useRef<HTMLDivElement>(null);

  const scrollToSection = (sectionRef: React.RefObject<HTMLDivElement>) => {
    sectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  if(!books) {
    return (
      <div className="container mx-auto py-20 text-center">
        <h1>Loading books...</h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans">
      {/* Navbar */}
      <nav className="bg-white shadow-md fixed w-full z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold">BOOKA</div>
          <div className="space-x-8 hidden md:flex">
            <button onClick={() => scrollToSection(booksRef)} className="text-gray-700 hover:text-gray-900">Books</button>
            <button onClick={() => scrollToSection(aboutRef)} className="text-gray-700 hover:text-gray-900">About</button>
            <button className="text-gray-700 hover:text-gray-900">Home</button>
            <button className="bg-primary text-white py-2 px-4 rounded">Sign Up</button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 h-screen flex flex-col justify-center items-center text-center text-white px-4 overflow-hidden">
        {/* Decorative Shapes */}
        <div className="absolute top-10 left-10 w-20 h-20 bg-white opacity-20 rounded-full animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-32 h-32 bg-white opacity-30 rounded-lg transform rotate-45"></div>
        <div className="absolute top-1/2 left-1/3 w-16 h-16 bg-white opacity-10 rounded-full animate-bounce"></div>

        {/* Hero Text */}
        <div className="relative z-10 max-w-2xl mx-auto">
          <p className="text-5xl font-bold mb-4">{authors.user.first_name}</p>
          <h1 className="text-5xl font-bold mb-4">The World of Books Awaits</h1>
          <p className="text-lg mb-8">A room without books is like a body without a soul. — Cicero</p>
        </div>
      </section>

      {/* Books Section */}
      <section ref={booksRef} className="py-20 bg-gray-100">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-10">{authors.user.first_name}'s Books</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            {authors.books.map((book) => (
              <div key={book.id} className="bg-white shadow-lg hover:shadow-2xl transition-shadow transform hover:scale-105 p-4 rounded-lg">
                <div>
                  <Image src={book.book_cover ?? "/book.jpg"} alt="Book Cover" width={250} height={100} className="rounded-lg object-contain h-full w-full " />
                </div>
                <h3 className="text-xl font-bold mt-4">{book.title}</h3>
                <p className="text-gray-700 mt-2">${book.price}</p>
                <div className="flex justify-between mt-4">
                  <button className="text-primary font-semibold hover:underline">View</button>
                  <button className="bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark">Buy Now</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Author Section */}
      <section ref={aboutRef} className="py-20 bg-gradient-to-b from-white to-gray-100">
        <div className="container mx-auto flex flex-col md:flex-row items-center">
          <div className="relative bg-gradient-to-r from-pink-400 to-purple-500">
            <Image src={authors.profile_picture ?? "/author.jpg"} alt="Author" width={500} height={700} className="shadow-lg" />
          </div>
          <div className="md:ml-10 mt-6 md:mt-0">
            <h2 className="text-3xl font-bold">About the Author</h2>
            <p className="mt-4 text-gray-700">
              John Doe is an acclaimed author with a passion for storytelling. With numerous bestsellers, he captivates
              audiences around the world through his words and imagination. His journey of writing has inspired many and
              continues to bring the magic of books to countless readers.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-gray-800 via-gray-900 to-black text-white py-10">
        <div className="container mx-auto text-center">
          <p className="text-lg">Connect with me</p>
          <div className="mt-4 flex justify-center space-x-6">
            <a href="#" className="text-pink-500 hover:text-white">Facebook</a>
            <a href="#" className="text-blue-500 hover:text-white">Twitter</a>
            <a href="#" className="text-indigo-500 hover:text-white">Instagram</a>
          </div>
          <p className="mt-8 text-gray-400">&copy; 2024 BOOKA. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
