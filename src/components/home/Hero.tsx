import React from "react";
import { Button } from "@/components/ui/button";

const Hero = () => {
  return (
    <div className="container mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-3 gap-8">
      <div className="md:col-span-2 relative rounded-lg overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-primary/80" />
        <div className="relative p-8 text-white">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            MARVELOUS SALE
          </h1>
          <p className="text-xl mb-6">SAVE UP TO 75%</p>
          <Button variant="secondary" size="lg">
            Shop Now
          </Button>
        </div>
      </div>
      <div className="space-y-4">
        <div className="bg-blue-500 text-white p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-2">
            Children&apos;s Fiction Collection
          </h2>
          <p className="text-2xl font-bold">FROM £4.99</p>
        </div>
        <div className="bg-orange-500 text-white p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-2">
            Learn to Cook with Recipe Books
          </h2>
          <p className="text-2xl font-bold">FROM £9.99</p>
        </div>
      </div>
    </div>
  );
};

export default Hero;
