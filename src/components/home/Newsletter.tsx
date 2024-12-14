"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Facebook, Instagram, Twitter } from "lucide-react";
import { useState } from "react";

export default function Newsletter() {
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle newsletter signup
    console.log("Newsletter signup:", email);
  };

  return (
    <section className="w-full py-12">
      <div className="container px-4 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="w-full flex items-center">
            <div className="flex-grow h-px bg-border"></div>
            <h2 className="text-2xl md:text-3xl font-semibold px-4 text-center text-[#8257F6]">
              Stay Updated
            </h2>
            <div className="flex-grow h-px bg-border"></div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-8 items-center justify-between mb-12">
          <div className="w-full md:w-1/2 text-center md:text-right">
            <h3 className="text-lg md:text-xl font-medium mb-4">
              Sign Up to the Booka Newsletter
            </h3>
            <p className="text-muted-foreground">
              Nunc volutpat ante nisl, at suscipit lectus congue sit amet.
              Integer non mauris est. Quisque ultricies id lacus ut porttitor.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="w-full md:w-1/2 flex flex-col sm:flex-row gap-4"
          >
            <Input
              type="email"
              placeholder="Your email address"
              className="flex-1"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Button
              type="submit"
              className="bg-[#8257F6] hover:bg-[#8257F6]/90 text-white whitespace-nowrap"
            >
              Subscribe →
            </Button>
          </form>
        </div>

        <div className="flex justify-center gap-6">
          <a
            href="#"
            className="rounded-full p-2 border border-muted hover:border-[#8257F6] transition-colors"
            aria-label="Facebook"
          >
            <Facebook className="w-5 h-5 text-muted-foreground hover:text-[#8257F6]" />
          </a>
          <a
            href="#"
            className="rounded-full p-2 border border-muted hover:border-[#8257F6] transition-colors"
            aria-label="Instagram"
          >
            <Instagram className="w-5 h-5 text-muted-foreground hover:text-[#8257F6]" />
          </a>
          <a
            href="#"
            className="rounded-full p-2 border border-muted hover:border-[#8257F6] transition-colors"
            aria-label="Twitter"
          >
            <Twitter className="w-5 h-5 text-muted-foreground hover:text-[#8257F6]" />
          </a>
        </div>
      </div>
    </section>
  );
}
