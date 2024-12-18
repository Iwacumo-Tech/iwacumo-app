import { Facebook, Twitter, Youtube } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Footer() {
  return (
    <footer className="bg-white">
      <div className="container mx-auto px-4 pt-16 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Company Info */}
          <div className="space-y-4">
            <h2 className="text-[#82d236] text-3xl font-bold">Booka.</h2>
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-semibold">Address: </span>
                Example Street 98, HH2
                <br />
                Bactfa, New York, USA
              </p>
              <p>
                <span className="font-semibold">Phone: </span>
                +18088 234 5678
              </p>
              <p>
                <span className="font-semibold">Email: </span>
                suport@hastech.com
              </p>
            </div>
          </div>

          {/* Information */}
          <div className="space-y-4">
            <h3 className="font-bold text-base">INFORMATION</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="hover:text-[#82d236] transition-colors">
                  Prices drop
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-[#82d236] transition-colors">
                  New products
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-[#82d236] transition-colors">
                  Best sales
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-[#82d236] transition-colors">
                  Contact us
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-[#82d236] transition-colors">
                  Sitemap
                </a>
              </li>
            </ul>
          </div>

          {/* Extras */}
          <div className="space-y-4">
            <h3 className="font-bold text-base">EXTRAS</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="hover:text-[#82d236] transition-colors">
                  Delivery
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-[#82d236] transition-colors">
                  About Us
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-[#82d236] transition-colors">
                  Stores
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-[#82d236] transition-colors">
                  Contact us
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-[#82d236] transition-colors">
                  Sitemap
                </a>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div className="space-y-4">
            <h3 className="font-bold text-base">NEWSLETTER SUBSCRIBE</h3>
            <div className="space-y-4">
              <Input
                type="email"
                placeholder="Enter Your Email Address Here.."
                className="bg-white border-gray-200"
              />
              <Button className="w-full bg-[#82d236] hover:bg-[#72bc2d] text-white">
                SUBSCRIBE
              </Button>
            </div>
            <div className="pt-2">
              <h4 className="font-bold text-base mb-4">STAY CONNECTED</h4>
              <div className="flex gap-2">
                <a
                  href="#"
                  className="bg-[#3b5998] p-2 text-white rounded hover:opacity-90 transition-opacity"
                >
                  <Facebook size={16} />
                </a>
                <a
                  href="#"
                  className="bg-[#1da1f2] p-2 text-white rounded hover:opacity-90 transition-opacity"
                >
                  <Twitter size={16} />
                </a>
                <a
                  href="#"
                  className="bg-[#ff0000] p-2 text-white rounded hover:opacity-90 transition-opacity"
                >
                  <Youtube size={16} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="bg-[#3c3c3c] text-white py-8">
        <div className="container mx-auto px-4">
          <div className="space-y-6">
            <p className="text-sm text-center text-gray-300">
              Suspendisse in auctor augue. Cras fermentum est ac fermentum
              tempor. Etiam vel magna volutpat, posuere eros
            </p>
            <div className="flex justify-center gap-4">
              <img
                src="/placeholder.svg?height=30&width=50"
                alt="PayPal"
                className="h-8"
              />
              <img
                src="/placeholder.svg?height=30&width=50"
                alt="Mastercard"
                className="h-8"
              />
              <img
                src="/placeholder.svg?height=30&width=50"
                alt="Discover"
                className="h-8"
              />
              <img
                src="/placeholder.svg?height=30&width=50"
                alt="Visa"
                className="h-8"
              />
            </div>
            <div className="text-sm text-center text-gray-300">
              <p>
                Copyright © 2022{" "}
                <a href="#" className="text-[#82d236] hover:underline">
                  Pustok
                </a>
                . All Right Reserved.
              </p>
              <p>Design By Pustok</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
