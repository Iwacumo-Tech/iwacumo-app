import Image from "next/image";
import { useRef } from "react";

export default function Home () {
  const booksRef = useRef<HTMLDivElement>(null);
  const aboutRef = useRef<HTMLDivElement>(null);

  const scrollToSection = (sectionRef: React.RefObject<HTMLDivElement>) => {
    sectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen font-sans">
      {/* Navbar */}
      <nav className="bg-white shadow-md fixed w-full z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold">BookApp</div>
          <div className="space-x-8 hidden md:flex">
            <button onClick={() => scrollToSection(booksRef)} className="text-gray-700 hover:text-gray-900">Books</button>
            <button onClick={() => scrollToSection(aboutRef)} className="text-gray-700 hover:text-gray-900">About</button>
            <button className="text-gray-700 hover:text-gray-900">Home</button>
            <button className="bg-primary text-white py-2 px-4 rounded">Sign Up</button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-hero-pattern text-black bg-cover bg-center h-screen flex flex-col justify-center text-center px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold mb-4">The World of Books Awaits</h1>
          <p className="text-lg mb-8">A room without books is like a body without a soul — Cicero</p>
        </div>
      </section>

      {/* Books Section */}
      <section ref={booksRef} className="py-20 bg-gray-100">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-10">Our Books</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {Array(6).fill(null)
              .map((_, idx) => (
                <div key={idx} className="bg-white shadow-md p-4 rounded-lg">
                  <Image src="/book-cover.jpg" alt="Book Cover" width={250} height={350} className="rounded-lg" />
                  <h3 className="text-xl font-bold mt-4">Book Title</h3>
                  <p className="text-gray-700 mt-2">$19.99</p>
                  <div className="flex justify-between mt-4">
                    <button className="text-primary font-semibold">View</button>
                    <button className="bg-primary text-white px-4 py-2 rounded">Buy Now</button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </section>

      {/* About Author Section */}
      <section ref={aboutRef} className="py-20">
        <div className="container mx-auto flex flex-col md:flex-row items-center">
          <Image src="/author.jpg" alt="Author" width={300} height={400} className="rounded-lg shadow-lg" />
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
      <footer className="bg-gray-800 text-white py-10">
        <div className="container mx-auto text-center">
          <p className="text-lg">Connect with Us</p>
          <div className="mt-4">
            <a href="#" className="text-primary hover:underline mx-2">Facebook</a>
            <a href="#" className="text-primary hover:underline mx-2">Twitter</a>
            <a href="#" className="text-primary hover:underline mx-2">Instagram</a>
          </div>
          <p className="mt-8">&copy; 2024 BookApp. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
