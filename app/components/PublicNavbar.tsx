"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

interface PublicNavbarProps {
  showAuthButtons?: boolean;
  currentPage?: "login" | "signup" | "home";
}

export default function PublicNavbar({
  showAuthButtons = true,
  currentPage = "home",
}: PublicNavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="text-2xl font-bold text-[#334746]">
              Noreen
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              <Link
                href="/#features"
                className="text-gray-700 hover:text-[#334746] transition-colors"
              >
                Features
              </Link>
              <Link
                href="/#services"
                className="text-gray-700 hover:text-[#334746] transition-colors"
              >
                Services
              </Link>
              <Link
                href="/#about"
                className="text-gray-700 hover:text-[#334746] transition-colors"
              >
                About
              </Link>
              <Link
                href="/#contact"
                className="text-gray-700 hover:text-[#334746] transition-colors"
              >
                Contact
              </Link>
            </div>
          </div>

          {/* Auth Buttons */}
          {showAuthButtons && (
            <div className="hidden md:flex items-center space-x-4">
              {currentPage !== "login" && (
                <Link href="/auth/login">
                  <Button
                    variant="ghost"
                    className="text-gray-700 hover:text-[#334746]"
                  >
                    Login
                  </Button>
                </Link>
              )}
              {currentPage !== "signup" && (
                <Link href="/auth/signup">
                  <Button className="bg-[#334746] hover:bg-gray-800">
                    {currentPage === "login" ? "Sign Up" : "Get Started"}
                  </Button>
                </Link>
              )}
              {currentPage === "signup" && (
                <Link href="/auth/login">
                  <Button variant="outline">Already have an account?</Button>
                </Link>
              )}
            </div>
          )}

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <Link
                href="/#features"
                className="block px-3 py-2 text-gray-700 hover:text-blue-600"
                onClick={() => setIsMenuOpen(false)}
              >
                Features
              </Link>
              <Link
                href="/#services"
                className="block px-3 py-2 text-gray-700 hover:text-blue-600"
                onClick={() => setIsMenuOpen(false)}
              >
                Services
              </Link>
              <Link
                href="/#about"
                className="block px-3 py-2 text-gray-700 hover:text-blue-600"
                onClick={() => setIsMenuOpen(false)}
              >
                About
              </Link>
              <Link
                href="/#contact"
                className="block px-3 py-2 text-gray-700 hover:text-blue-600"
                onClick={() => setIsMenuOpen(false)}
              >
                Contact
              </Link>

              {showAuthButtons && (
                <div className="flex flex-col space-y-2 px-3 pt-4">
                  {currentPage !== "login" && (
                    <Link href="/auth/login">
                      <Button variant="outline" className="w-full">
                        Login
                      </Button>
                    </Link>
                  )}
                  {currentPage !== "signup" && (
                    <Link href="/auth/signup">
                      <Button className="w-full bg-blue-600 hover:bg-blue-700">
                        {currentPage === "login" ? "Sign Up" : "Get Started"}
                      </Button>
                    </Link>
                  )}
                  {currentPage === "signup" && (
                    <Link href="/auth/login">
                      <Button variant="outline" className="w-full">
                        Already have an account?
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
