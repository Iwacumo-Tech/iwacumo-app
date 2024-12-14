
"use client";

import { useParams } from "next/navigation";
import { trpc } from "@/app/_providers/trpc-provider";
import Home2 from "@/components/LandingCompo";

export default function Page () {
  const params = useParams();
  const id = params?.id as string;
  const { data: authors, isLoading: isLoadingAuthor } = trpc.getAuthorBySlug.useQuery({ id });
  const { data: books, isLoading: isLoadingBooks } = trpc.getAllBooks.useQuery();

  if (isLoadingAuthor || isLoadingBooks) {
    return <div>Loading...</div>;
  }

  if (!authors) {
    return <div>Author not found</div>;
  }

  return (

  // <div className="flex flex-col">

  //   <nav className="bg-gray-800 text-white py-4 px-4 md:px-8 flex justify-between items-center">
  //     <div className="space-x-4">
  //       <a href="#about" className="hover:underline">
  //   About Me
  //       </a>
  //       <a href="#books" className="hover:underline">
  //   Books
  //       </a>
  //     </div>
  //     <div className="flex items-center space-x-4">

  //       <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md">
  //        Buy Book
  //       </button>
  //     </div>
  //   </nav>

  //   <section id="about" className="bg-gray-200 py-16 px-4 md:px-28">
  //     <h1 className="text-2xl md:text-4xl font-bold mb-4 text-gray-600">{authors.name}</h1>

  //     <div className="flex flex-col lg:flex-row items-center gap-20">

  //       <div className="w-full lg:w-1/3">
  //         <Image
  //           src={authors.profile_picture!}
  //           alt="Book"
  //           width={100}
  //           height={100}
  //           className="rounded-md w-full h-full object-cover"
  //         />
  //       </div>

  //       <div className="lg:w-2/3 gap-20">
  //         <p className="text-xl md:text-2xl mb-4 max-w-72 text-black">
  //        The more that you read, the more things you&apos;ll know.
  //         </p>
  //         <p className="text-lg text-black">{authors.bio}</p>
  //         <p className="mt-4 max-w-72 text-black">The more that you learn, the more places you&apos;ll go.</p>
  //       </div>
  //     </div>
  //   </section>

  //   <section id="books" className="py-16 px-4 md:px-28">
  //     <h2 className="text-2xl md:text-3xl font-bold mb-6 text-black">Books Collection</h2>

  //     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
  //       {books?.map((book) => (
  //         <div
  //           key={book.id}
  //           className="bg-white shadow-lg p-4 rounded-lg border border-[#A3ADFF]"
  //         >

  //           <Image
  //             src={"/book.jpeg"}
  //             alt={book.title}
  //             width={100}
  //             height={100}
  //             className="w-full h-48 object-cover mb-4 rounded-lg"
  //           />

    //           <h3 className="text-xl font-semibold text-black mb-2">{book.title}</h3>
    //           <p className="text-black mb-4">{book.description}</p>
    //           <p className="text-lg font-bold text-black mb-4">${book.price}</p>
    //           <a href={`#book-${book.id}`} className="text-blue-500 hover:underline">
    //       More Details
    //           </a>
    //         </div>
    //       ))}
    //     </div>
    //   </section>
    // </div>
    <div>
      <Home2 books={books} authors={authors} />
    </div>
  );
}
