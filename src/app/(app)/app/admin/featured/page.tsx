"use client";

import { useState } from "react";
import { trpc } from "@/app/_providers/trpc-provider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { Star, Search } from "lucide-react";

export default function GlobalFeaturedPage() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { data: books, isLoading } = trpc.getAllBooks.useQuery();

  const [query, setQuery] = useState("");

  const filteredBooks = (books ?? []).filter((book) => {
    const q = query.toLowerCase();
    return (
      book.title?.toLowerCase().includes(q) ||
      book.author?.name?.toLowerCase().includes(q)
    );
  });

  const toggleFeaturedMutation = trpc.toggleFeatured.useMutation({
    onSuccess: (updatedBook) => {
      toast({
        title: "Curation Updated",
        description: `${updatedBook.title} is ${updatedBook.featured ? "now" : "no longer"} featured.`,
      });
      utils.getAllBooks.invalidate();
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        variant: "destructive",
        description: error.message,
      });
    }
  });

  if (isLoading) return <div className="font-black italic uppercase p-10 text-primary animate-pulse">Fetching Library...</div>;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-primary text-white border-4 border-primary p-8 gumroad-shadow">
        <h2 className="text-3xl font-black uppercase italic tracking-tighter">Global Curation Hub</h2>
        <p className="font-bold text-xs uppercase opacity-70 tracking-widest mt-2">
          Featured books here will appear on the Booka.africa main homepage.
        </p>
      </div>

      {/* Search filter */}
      <div className="relative">
        <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title or author..."
          className="input-gumroad pl-10 h-12"
        />
      </div>

      {/* Table */}
      <div className="bg-white border-4 border-primary gumroad-shadow overflow-hidden">
        <Table>
          <TableHeader className="bg-primary">
            <TableRow className="hover:bg-transparent border-none">
              <TableHead className="text-white font-black uppercase italic py-6">Master Library</TableHead>
              <TableHead className="text-white font-black uppercase italic text-center">Featured Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBooks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="py-16 text-center font-black uppercase italic opacity-20">
                  No books match your search.
                </TableCell>
              </TableRow>
            ) : filteredBooks.map((book) => (
              <TableRow key={book.id} className="border-b-4 border-muted last:border-0 hover:bg-accent/5 transition-colors">
                <TableCell className="py-6">
                  <p className="font-black uppercase italic text-primary">{book.title}</p>
                  <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">by {book.author?.name}</p>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center items-center gap-4">
                    {book.featured && <Star className="fill-accent text-accent w-5 h-5" />}
                    <Switch 
                      checked={book.featured || false}
                      onCheckedChange={(checked) => 
                        toggleFeaturedMutation.mutate({ 
                          bookId: book.id, 
                          featured: checked,
                          scope: "global"
                        })
                      }
                      className="data-[state=checked]:bg-accent data-[state=unchecked]:bg-muted"
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}