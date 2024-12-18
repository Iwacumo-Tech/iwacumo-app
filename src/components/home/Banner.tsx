import { Button } from "@/components/ui/button";

export default function Banner () {
  return (
    <div className="container px-4 pb-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Book Banner */}
        <div className="relative bg-[#ffecd1] rounded-lg overflow-hidden">
          <div className="p-8">
            <h2 className="text-3xl font-bold mb-2">The Book</h2>
            <p className="text-lg text-muted-foreground mb-4">
              Available Worldwide
            </p>
            <Button className="bg-[#8b1e1e] hover:bg-[#6f1818]">
              Shop Now
            </Button>
          </div>
          <div className="absolute right-0 bottom-0 w-1/2 h-full">
            <div className="relative w-full h-full">
              <img
                src="/placeholder.svg?height=300&width=200"
                alt="Book Collection"
                className="object-cover object-center w-full h-full"
              />
            </div>
          </div>
        </div>

        {/* Sale Banner */}
        <div className="bg-[#d32f2f] rounded-lg overflow-hidden text-white p-8 flex items-center justify-between">
          <div className="text-4xl md:text-6xl font-bold">SALE</div>
          <div className="bg-white text-[#d32f2f] p-4 rounded-lg">
            <div className="text-sm">UP TO</div>
            <div className="text-4xl font-bold">40%</div>
            <div className="text-sm">OFF</div>
          </div>
        </div>
      </div>
    </div>
  );
}
