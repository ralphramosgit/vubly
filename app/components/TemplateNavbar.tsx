"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

const TemplateNavbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  // Function to check if a link is active
  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <nav className="bg-saas-black bg-opacity-90 backdrop-blur-sm sticky top-0 z-50 border-b border-saas-darkGray">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" className="flex items-center">
              <span className="text-2xl font-bold bg-gradient-to-r from-saas-yellow to-yellow-400 bg-clip-text text-transparent">
                Sassland
              </span>
            </Link>
          </div>

          {/* Desktop menu */}
          <div className="hidden md:block">
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  isActive("/")
                    ? "text-saas-yellow"
                    : "text-white hover:text-saas-yellow"
                }`}
              >
                Home
              </Link>
              <Link
                href="/roadmap"
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  isActive("/roadmap")
                    ? "text-saas-yellow"
                    : "text-white hover:text-saas-yellow"
                }`}
              >
                Roadmap
              </Link>
              <Link
                href="/pricing"
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  isActive("/pricing")
                    ? "text-saas-yellow"
                    : "text-white hover:text-saas-yellow"
                }`}
              >
                Pricing
              </Link>
              <Link
                href="/contact"
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  isActive("/contact")
                    ? "text-saas-yellow"
                    : "text-white hover:text-saas-yellow"
                }`}
              >
                Contact
              </Link>
              <Link
                href="/blog"
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  isActive("/blog") || pathname.startsWith("/blog")
                    ? "text-saas-yellow"
                    : "text-white hover:text-saas-yellow"
                }`}
              >
                Blog
              </Link>
            </div>
          </div>

          {/* CTA Button */}
          <div className="hidden md:block invisible">
            <a
              href="https://codescandy.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary w-full"
            >
              Get Template
            </a>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-white focus:outline-none"
            >
              {isOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden bg-saas-darkGray">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link
              href="/"
              className={`block px-3 py-2 text-base font-medium ${
                isActive("/")
                  ? "text-saas-yellow"
                  : "text-white hover:text-saas-yellow"
              }`}
              onClick={() => setIsOpen(false)}
            >
              Home
            </Link>
            <Link
              href="/roadmap"
              className={`block px-3 py-2 text-base font-medium ${
                isActive("/roadmap")
                  ? "text-saas-yellow"
                  : "text-white hover:text-saas-yellow"
              }`}
              onClick={() => setIsOpen(false)}
            >
              Roadmap
            </Link>
            <Link
              href="/pricing"
              className={`block px-3 py-2 text-base font-medium ${
                isActive("/pricing")
                  ? "text-saas-yellow"
                  : "text-white hover:text-saas-yellow"
              }`}
              onClick={() => setIsOpen(false)}
            >
              Pricing
            </Link>
            <Link
              href="/contact"
              className={`block px-3 py-2 text-base font-medium ${
                isActive("/contact")
                  ? "text-saas-yellow"
                  : "text-white hover:text-saas-yellow"
              }`}
              onClick={() => setIsOpen(false)}
            >
              Contact
            </Link>
            <Link
              href="/blog"
              className={`block px-3 py-2 text-base font-medium ${
                isActive("/blog") || pathname.startsWith("/blog")
                  ? "text-saas-yellow"
                  : "text-white hover:text-saas-yellow"
              }`}
              onClick={() => setIsOpen(false)}
            >
              Blog
            </Link>
            <div className="mt-4 px-3 py-2">
              <a
                href="https://codescandy.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary w-full"
              >
                Get Template
              </a>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default TemplateNavbar;
