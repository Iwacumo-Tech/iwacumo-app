import { useState } from "react";
import Link from "next/link";
import {
  ShoppingCart,
  Book,
  ChevronDown,
  Star,
  Menu,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  return (
    <div className="w-full">
      {/* Top Bar */}
      <div className="flex justify-between items-center px-4 py-2 text-sm border-b">
        <div className="hidden md:flex gap-4">
          <Link
            className="text-muted-foreground hover:text-primary"
            href="/login"
          >
            Login / Register
          </Link>
          <Link className="text-muted-foreground hover:text-primary" href="#">
            FAQ
          </Link>
          <Link className="text-muted-foreground hover:text-primary" href="#">
            Contact Us
          </Link>
        </div>
        <div className="md:hidden">
          <Sheet open={isUserMenuOpen} onOpenChange={setIsUserMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
                <span className="sr-only">User menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <nav className="flex flex-col gap-4">
                <Link
                  className="text-primary hover:text-primary/80"
                  href="/login"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                  }}
                >
                  Login / Register
                </Link>
                <Link
                  className="text-muted-foreground hover:text-primary"
                  href="#"
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  FAQ
                </Link>
                <Link
                  className="text-muted-foreground hover:text-primary"
                  href="#"
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  Contact Us
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
        <div className="flex items-center gap-4 md:gap-6">
          <Link href="#" className="flex items-center gap-2 text-primary">
            <Book className="h-4 w-4" />
            <div className="hidden md:block">
              <div className="font-medium">Bookshelf</div>
              <div className="text-xs text-muted-foreground">Books</div>
            </div>
          </Link>
          <Link href="#" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            <div className="hidden md:block">
              <div className="font-medium">Your Basket</div>
              <div className="text-xs text-muted-foreground">£0.00</div>
            </div>
          </Link>
        </div>
      </div>

      {/* Main Header */}
      <header className="container mx-auto px-4 py-4">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <Link
            href="/"
            className="text-2xl md:text-3xl font-bold text-primary"
          >
            Booka
          </Link>
          <div className="flex-1 w-full flex gap-2">
            <Input
              className="flex-1"
              placeholder="Search for the perfect book..."
              type="search"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="hidden md:flex gap-2">
                  Browse Categories
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>Fiction</DropdownMenuItem>
                <DropdownMenuItem>Non-Fiction</DropdownMenuItem>
                <DropdownMenuItem>Children&apos;s Books</DropdownMenuItem>
                <DropdownMenuItem>Academic</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button>Go</Button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-4 flex justify-between items-center">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden">
                <Menu className="h-4 w-4" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <nav className="flex flex-col gap-4">
                <Link
                  className="text-primary hover:text-primary/80"
                  href="#"
                  onClick={() => setIsOpen(false)}
                >
                  Home
                </Link>
                <Link
                  className="text-muted-foreground hover:text-primary"
                  href="#"
                  onClick={() => setIsOpen(false)}
                >
                  Mega Menu
                </Link>
                <Link
                  className="text-muted-foreground hover:text-primary"
                  href="#"
                  onClick={() => setIsOpen(false)}
                >
                  Shop
                </Link>
                <Link
                  className="text-muted-foreground hover:text-primary"
                  href="#"
                  onClick={() => setIsOpen(false)}
                >
                  Shortcodes
                </Link>
                <Link
                  className="text-muted-foreground hover:text-primary"
                  href="#"
                  onClick={() => setIsOpen(false)}
                >
                  News
                </Link>
                <Link
                  className="text-muted-foreground hover:text-primary"
                  href="#"
                  onClick={() => setIsOpen(false)}
                >
                  Contact Us
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
          <div className="hidden md:flex gap-6">
            <Link className="text-primary hover:text-primary/80" href="#">
              Home
            </Link>
            <Link className="text-muted-foreground hover:text-primary" href="#">
              Mega Menu
            </Link>
            <Link className="text-muted-foreground hover:text-primary" href="#">
              Shop
            </Link>
            <Link className="text-muted-foreground hover:text-primary" href="#">
              Shortcodes
            </Link>
            <Link className="text-muted-foreground hover:text-primary" href="#">
              News
            </Link>
            <Link className="text-muted-foreground hover:text-primary" href="#">
              Contact Us
            </Link>
          </div>
        </nav>
      </header>

      {/* Promotional Banners */}
      <div className="bg-primary/5 py-4">
        <div className="container mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 px-4">
          <div className="bg-primary text-primary-foreground rounded-lg p-4 text-center">
            FREE STANDARD DELIVERY ON ORDERS OVER £25
          </div>
          <div className="bg-primary text-primary-foreground rounded-lg p-4 text-center flex items-center justify-center gap-2">
            <Star className="h-5 w-5 fill-current" /> SALE NOW ON! SAVE UP TO
            75% <Star className="h-5 w-5 fill-current" />
          </div>
          <div className="bg-primary text-primary-foreground rounded-lg p-4 text-center">
            SIGNUP FOR ALL THE LATEST NEWS & OFFERS
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
