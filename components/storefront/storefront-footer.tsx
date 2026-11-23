
import Link from "next/link";

export default function StorefrontFooter() {
  return (
    <footer className="bg-[#111111] px-6 py-14 text-white md:px-10">
      <div className="mx-auto grid max-w-[1500px] gap-10 sm:grid-cols-2 md:grid-cols-4">
        {/* Brand */}
        <div>
          <h2 className="text-3xl font-black tracking-tighter">
            HOVER UP.
          </h2>

          <p className="mt-4 max-w-xs text-sm leading-6 text-neutral-400">
            Your style. Your statement. Discover Hover Up.
          </p>
        </div>

        {/* Shop */}
        <div>
          <h3 className="text-xs font-extrabold tracking-widest">
            SHOP
          </h3>

          <div className="mt-5 space-y-3 text-sm font-medium text-neutral-400">
            <p>
              <Link className="transition hover:text-white" href="/shop">
                All Products
              </Link>
            </p>

            <p>
              <Link className="transition hover:text-white" href="/categories">
                Categories
              </Link>
            </p>

            <p>
              <Link className="transition hover:text-white" href="/wishlist">
                Wishlist
              </Link>
            </p>

            <p>
              <Link className="transition hover:text-white" href="/collections">
                Collections
              </Link>
            </p>
          </div>
        </div>

        {/* Customer Care */}
        <div>
          <h3 className="text-xs font-extrabold tracking-widest">
            CUSTOMER CARE
          </h3>

          <div className="mt-5 space-y-3 text-sm font-medium text-neutral-400">
            <p>
              <Link className="transition hover:text-white" href="/contact">
                Contact Us
              </Link>
            </p>

            <p>
              <Link className="transition hover:text-white" href="/faq">
                FAQs
              </Link>
            </p>

            <p>
              <Link
                className="transition hover:text-white"
                href="/policies/shipping"
              >
                Shipping Policy
              </Link>
            </p>

            <p>
              <Link
                className="transition hover:text-white"
                href="/policies/returns"
              >
                Returns
              </Link>
            </p>
          </div>
        </div>

        {/* Account */}
        <div>
          <h3 className="text-xs font-extrabold tracking-widest">
            ACCOUNT
          </h3>

          <div className="mt-5 space-y-3 text-sm font-medium text-neutral-400">
            <p>
              <Link className="transition hover:text-white" href="/account">
                My Account
              </Link>
            </p>

            <p>
              <Link
                className="transition hover:text-white"
                href="/account/orders"
              >
                My Orders
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="mx-auto mt-12 max-w-[1500px] border-t border-white/15 pt-6 text-xs text-neutral-500">
        © 2026 Hover Up. All rights reserved.
      </div>
    </footer>
  );
}
