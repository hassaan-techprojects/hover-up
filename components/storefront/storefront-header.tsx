
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  Home,
  Search,
  ShoppingBag,
  UserRound,
  Heart,
  ShoppingCart,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

const shopLinks = [
  { label: "All Products", href: "/shop" },
  { label: "Categories", href: "/categories" },
  { label: "New Arrivals", href: "/shop?sort=newest" },
];

const collectionLinks = [
  { label: "All Collections", href: "/collections" },
  { label: "Latest Collection", href: "/shop?sort=newest" },
];

function AnnouncementContent() {
  return (
    <div className="flex shrink-0 items-center whitespace-nowrap px-5 text-[10px] font-bold uppercase tracking-[0.12em] sm:px-8 sm:text-xs sm:tracking-[0.16em]">
      <span className="text-white">Get </span>
      <span className="mx-1 text-[#FFD700]">10% OFF</span>
      <span className="text-white"> on All Orders</span>
      <span className="mx-4 text-[#FFD700]">|</span>
      <span className="text-[#FFD700]">FREE Shipping</span>
      <span className="mx-4 text-[#FFD700]">|</span>
      <Link
        href="/shop"
        className="text-white underline decoration-[#FFD700] underline-offset-4 transition-colors hover:text-[#FFD700]"
      >
        Shop Now!
      </Link>
      <span className="mx-4 text-[#FFD700]">|</span>
    </div>
  );
}

export default function StorefrontHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountSectionOpen, setAccountSectionOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  const closeMenu = () => setMenuOpen(false);
  const isHomeActive = pathname === "/";
  const isShopActive = pathname === "/shop" || pathname.startsWith("/categories") || pathname.startsWith("/collections");
  const isAccountActive = pathname.startsWith("/account");
  const navItemClass = (active: boolean) =>
    `mobile-nav-item relative flex h-full flex-col items-center justify-center gap-1.5 transition-colors duration-300 ${active ? "text-[#a98762]" : "text-[#171717]"}`;

  useEffect(() => {
    const syncCartCount = () => {
      try {
        const stored = localStorage.getItem("hover-up-cart");
        const items = stored ? JSON.parse(stored) as unknown[] : [];
        setCartCount(Array.isArray(items) ? items.length : 0);
      } catch {
        setCartCount(0);
      }
    };
    syncCartCount();
    window.addEventListener("storage", syncCartCount);
    window.addEventListener("hover-up-cart-updated", syncCartCount);
    return () => {
      window.removeEventListener("storage", syncCartCount);
      window.removeEventListener("hover-up-cart-updated", syncCartCount);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setSearchOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  return (
    <>
      {/* Announcement Bar */}
      <div className="announcement-bar w-full overflow-hidden bg-[#000000] py-2.5 text-white">
        <div className="announcement-marquee flex w-max">
          <AnnouncementContent />
          <AnnouncementContent />
          <AnnouncementContent />
          <AnnouncementContent />
        </div>
      </div>

      {/* Main Header */}
      <header className="sticky top-0 z-40 border-b border-[#e8e3dc] bg-white/95 backdrop-blur-md">
        <div className="relative mx-auto flex h-[76px] max-w-[1500px] items-center justify-between px-5 md:px-10">
          {/* Hamburger Menu */}
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={menuOpen}
            className="group flex items-center gap-3 text-black transition-all duration-300 hover:text-[#b99a76]"
          >
            <Menu
              size={25}
              strokeWidth={2.2}
              className="transition-transform duration-300 group-hover:rotate-90"
            />

            <span className="hidden text-[12px] font-extrabold tracking-[0.16em] sm:inline">
              MENU
            </span>
          </button>

          {/* Brand Logo */}
          <Link
            href="/"
            aria-label="Hover Up Home"
            className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2"
          >
            <img
              src="/hu.png"
              alt="HOVER UP Logo"
              className="h-14 w-14 shrink-0 object-cover sm:h-16 sm:w-16"
            />

            <span
              aria-label="HOVER UP"
              className="hoverup-logo-wordmark whitespace-nowrap text-xl font-black tracking-[0.14em] text-black sm:text-3xl"
            >
              {"HOVER UP".split("").map((letter, index) => (
                <span
                  key={index}
                  aria-hidden="true"
                  className="hoverup-logo-letter"
                  style={{ animationDelay: `${index * 85}ms` }}
                >
                  {letter === " " ? "\u00a0" : letter}
                </span>
              ))}
              <span className="text-[#b99a76]">.</span>
            </span>
          </Link>

          {/* Desktop Header Icons */}
          <div className="hidden items-center gap-6 md:flex">
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              aria-label="Search"
              className="hover-icon"
            >
              <Search size={21} strokeWidth={2} />
            </button>

            <Link href="/wishlist" aria-label="Wishlist" className="hover-icon">
              <Heart size={21} strokeWidth={2} />
            </Link>

            <Link href="/cart" aria-label={`Shopping cart, ${cartCount} item(s)`} className="hover-icon relative">
              <ShoppingCart size={21} strokeWidth={2} />
              {cartCount > 0 && <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#b99a76] px-1 text-[10px] font-bold text-white">{cartCount > 99 ? "99+" : cartCount}</span>}
            </Link>

            <Link href="/account" aria-label="Account" className="hover-icon">
              <UserRound size={21} strokeWidth={2} />
            </Link>
          </div>

          {/* Mobile Header Icons */}
          <div className="flex shrink-0 items-center gap-4 md:hidden">
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              aria-label="Search"
              className="hover-icon"
            >
              <Search size={22} strokeWidth={2} />
            </button>

            <Link
              href="/cart"
              aria-label="Shopping cart"
              className="hover-icon relative"
            >
              <ShoppingCart size={22} strokeWidth={2} />
              {cartCount > 0 && <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#b99a76] px-1 text-[10px] font-bold text-white">{cartCount > 99 ? "99+" : cartCount}</span>}
            </Link>
          </div>
        </div>

        {/* Search Panel */}
        {searchOpen && (
          <div className="animate-search border-t border-[#e8e3dc] bg-white px-5 py-5">
            <form
              action="/search"
              className="mx-auto flex max-w-3xl items-center gap-3 border-b border-neutral-300 pb-3"
            >
              <Search size={20} className="shrink-0 text-black" />

              <input
                name="q"
                type="search"
                placeholder="Search products, categories..."
                className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-neutral-400"
                autoFocus
              />

              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                aria-label="Close search"
                className="hover-icon"
              >
                <X size={20} />
              </button>
            </form>
          </div>
        )}
      </header>

      {/* Desktop Navigation */}
      <nav className="relative z-30 hidden border-b border-[#e8e3dc] bg-[#f8f6f2] md:block">
        <div className="mx-auto flex h-[64px] max-w-[1500px] items-center justify-center gap-12 px-8">
          <Link
            href="/"
            className="hover-nav-link flex h-full items-center border-b-[3px] border-[#b99a76] pt-[3px] text-[13px] font-extrabold uppercase tracking-[0.12em] text-black"
          >
            Home
          </Link>

          {/* Shop Dropdown */}
          <div className="group relative flex h-full items-center">
            <Link
              href="/shop"
              className="hover-nav-link flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-[0.12em] text-black"
            >
              Shop
              <ChevronDown
                size={15}
                strokeWidth={2.5}
                className="transition-transform duration-300 group-hover:rotate-180"
              />
            </Link>

            <div className="dropdown-menu absolute left-0 top-full z-50 w-56 border border-[#e8e3dc] bg-white p-2 shadow-xl">
              {shopLinks.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="block px-4 py-3 text-sm font-semibold text-black transition-colors duration-200 hover:bg-[#f8f6f2] hover:text-[#b99a76]"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <Link
            href="/about"
            className="hover-nav-link text-[13px] font-extrabold uppercase tracking-[0.12em] text-black"
          >
            About
          </Link>

          {/* Collections Dropdown */}
          <div className="group relative flex h-full items-center">
            <Link
              href="/collections"
              className="hover-nav-link flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-[0.12em] text-black"
            >
              Collections
              <ChevronDown
                size={15}
                strokeWidth={2.5}
                className="transition-transform duration-300 group-hover:rotate-180"
              />
            </Link>

            <div className="dropdown-menu absolute left-0 top-full z-50 w-56 border border-[#e8e3dc] bg-white p-2 shadow-xl">
              {collectionLinks.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="block px-4 py-3 text-sm font-semibold text-black transition-colors duration-200 hover:bg-[#f8f6f2] hover:text-[#b99a76]"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <Link
            href="/contact"
            className="hover-nav-link text-[13px] font-extrabold uppercase tracking-[0.12em] text-black"
          >
            Contact
          </Link>
        </div>
      </nav>

      {/* Animated Menu Drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-[60]">
          {/* Background Overlay */}
          <button
            className="animate-overlay absolute inset-0 cursor-default bg-black/55"
            onClick={closeMenu}
            aria-label="Close menu"
          />

          {/* Drawer */}
          <aside className="animate-drawer absolute left-0 top-0 flex h-full w-[min(390px,88vw)] flex-col bg-[#f8f6f2] shadow-2xl">
            {/* Drawer Header */}
            <div className="flex h-[76px] items-center justify-between border-b border-[#e8e3dc] px-7">
              <Link
                href="/"
                onClick={closeMenu}
                aria-label="Hover Up Home"
                className="flex items-center gap-2"
              >
                <img
                  src="/hu.png"
                  alt="HOVER UP Logo"
                  className="h-12 w-auto object-contain"
                />

                <span className="whitespace-nowrap text-xl font-black tracking-tight text-black">
                  HOVER UP<span className="text-[#b99a76]">.</span>
                </span>
              </Link>

              <button
                onClick={closeMenu}
                aria-label="Close menu"
                className="hover-icon"
              >
                <X size={25} strokeWidth={2.2} />
              </button>
            </div>

            {/* Drawer Links */}
            <div className="flex-1 overflow-y-auto px-7 py-8">
              <div className="space-y-1">
                <Link
                  href="/"
                  onClick={closeMenu}
                  className="menu-link flex items-center justify-between border-b border-[#e8e3dc] py-5 text-base font-extrabold tracking-wide text-black transition-colors hover:text-[#b99a76]"
                >
                  Home
                  <ChevronRight size={18} className="text-[#a18c75]" />
                </Link>

                <div className="menu-link border-b border-[#e8e3dc] py-5">
                  <Link
                    href="/shop"
                    onClick={closeMenu}
                    className="flex items-center justify-between text-base font-extrabold tracking-wide text-black transition-colors hover:text-[#b99a76]"
                  >
                    Shop
                    <ChevronRight size={18} className="text-[#a18c75]" />
                  </Link>

                  <div className="mt-4 space-y-4 pl-4 text-sm font-semibold text-neutral-600">
                    {shopLinks.map((item) => (
                      <Link
                        key={item.label}
                        href={item.href}
                        onClick={closeMenu}
                        className="block transition-colors duration-200 hover:translate-x-1 hover:text-[#b99a76]"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>

                <Link
                  href="/collections"
                  onClick={closeMenu}
                  className="menu-link flex items-center justify-between border-b border-[#e8e3dc] py-5 text-base font-extrabold tracking-wide text-black transition-colors hover:text-[#b99a76]"
                >
                  Collections
                  <ChevronRight size={18} className="text-[#a18c75]" />
                </Link>

                <Link
                  href="/about"
                  onClick={closeMenu}
                  className="menu-link flex items-center justify-between border-b border-[#e8e3dc] py-5 text-base font-extrabold tracking-wide text-black transition-colors hover:text-[#b99a76]"
                >
                  About Us
                  <ChevronRight size={18} className="text-[#a18c75]" />
                </Link>

                <Link
                  href="/contact"
                  onClick={closeMenu}
                  className="menu-link flex items-center justify-between border-b border-[#e8e3dc] py-5 text-base font-extrabold tracking-wide text-black transition-colors hover:text-[#b99a76]"
                >
                  Contact
                  <ChevronRight size={18} className="text-[#a18c75]" />
                </Link>
              </div>

              {/* Customer Links */}
              <div className="mt-9 space-y-5">
                <div className="border-b border-[#e8e3dc] pb-5">
                  <button
                    type="button"
                    onClick={() => setAccountSectionOpen(open => !open)}
                    aria-expanded={accountSectionOpen}
                    aria-controls="customer-account-submenu"
                    className="flex w-full items-center justify-between text-base font-extrabold text-black transition-colors hover:text-[#b99a76]"
                  >
                    <span className="flex items-center gap-3">
                      <UserRound size={20} strokeWidth={2} />
                      Account
                    </span>
                    <ChevronDown size={18} className={`transition-transform duration-200 ${accountSectionOpen ? "rotate-180" : ""}`} />
                  </button>
                  {accountSectionOpen && (
                    <div id="customer-account-submenu" className="mt-4 ml-8 space-y-4 border-l-2 border-[#d8c5ae] pl-4">
                      <Link href="/account" onClick={closeMenu} className="block py-1 text-base font-bold text-black transition-colors hover:text-[#b99a76]">Account</Link>
                      <Link href="/account/track-order" onClick={closeMenu} className="block py-1 text-base font-bold text-black transition-colors hover:text-[#b99a76]">Order Tracker</Link>
                      <Link href="/account/orders" onClick={closeMenu} className="block py-1 text-base font-bold text-black transition-colors hover:text-[#b99a76]">My Orders</Link>
                    </div>
                  )}
                </div>

                <Link
                  href="/wishlist"
                  onClick={closeMenu}
                  className="flex items-center gap-3 text-sm font-bold text-black transition-colors hover:text-[#b99a76]"
                >
                  <Heart size={19} strokeWidth={2} />
                  My Wishlist
                </Link>

                <Link
                  href="/cart"
                  onClick={closeMenu}
                  className="flex items-center gap-3 text-sm font-bold text-black transition-colors hover:text-[#b99a76]"
                >
                  <ShoppingCart size={19} strokeWidth={2} />
                  Shopping Cart
                </Link>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="border-t border-[#e8e3dc] px-7 py-6 text-xs font-medium text-neutral-500" />
          </aside>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <nav aria-label="Mobile navigation" className="fixed bottom-0 left-0 z-50 grid h-[72px] w-full grid-cols-4 border-t border-[#e8e3dc] bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.05)] backdrop-blur-md md:hidden">
        <Link
          href="/"
          aria-current={isHomeActive ? "page" : undefined}
          className={navItemClass(isHomeActive)}
        >
          {isHomeActive && <span aria-hidden="true" className="absolute top-0 h-[3px] w-9 rounded-full bg-[#b99a76]" />}
          <Home size={26} strokeWidth={2.15} />
          <span className={`text-[11px] ${isHomeActive ? "font-extrabold" : "font-semibold"}`}>Home</span>
        </Link>

        <button
          type="button"
          aria-label="Search"
          aria-current={searchOpen ? "page" : undefined}
          onClick={() => {
            setSearchOpen(true);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className={navItemClass(searchOpen)}
        >
          {searchOpen && <span aria-hidden="true" className="absolute top-0 h-[3px] w-9 rounded-full bg-[#b99a76]" />}
          <Search size={26} strokeWidth={2.15} />
          <span className={`text-[11px] ${searchOpen ? "font-extrabold" : "font-semibold"}`}>Search</span>
        </button>

        <Link
          href="/shop"
          aria-current={isShopActive ? "page" : undefined}
          className={navItemClass(isShopActive)}
        >
          {isShopActive && <span aria-hidden="true" className="absolute top-0 h-[3px] w-9 rounded-full bg-[#b99a76]" />}
          <ShoppingBag size={26} strokeWidth={2.15} />
          <span className={`text-[11px] ${isShopActive ? "font-extrabold" : "font-semibold"}`}>Shop</span>
        </Link>

        <Link
          href="/account"
          aria-current={isAccountActive ? "page" : undefined}
          className={navItemClass(isAccountActive)}
        >
          {isAccountActive && <span aria-hidden="true" className="absolute top-0 h-[3px] w-9 rounded-full bg-[#b99a76]" />}
          <UserRound size={26} strokeWidth={2.15} />
          <span className={`text-[11px] ${isAccountActive ? "font-extrabold" : "font-semibold"}`}>Account</span>
        </Link>
      </nav>
    </>
  );
}
