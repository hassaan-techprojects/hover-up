
"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import {
  Menu,
  Search,
  Bell,
  ChevronRight,
} from "lucide-react";

type DashboardHeaderProps = {
  onMenuClick: () => void;
};

const pageNames: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/analytics": "Analytics",
  "/dashboard/products": "Products",
  "/dashboard/categories": "Categories",
  "/dashboard/attributes": "Attributes",
  "/dashboard/orders": "Orders",
  "/dashboard/customers": "Customers",
  "/dashboard/inventory": "Inventory",
  "/dashboard/shipping": "Shipping",
  "/dashboard/banners": "Banners & Media",
  "/dashboard/discounts": "Discounts",
  "/dashboard/marketing": "Marketing",
  "/dashboard/reports": "Reports",
  "/dashboard/team": "Team & Roles",
  "/dashboard/settings": "Settings",
  "/dashboard/activity-logs": "Activity Logs",
};

function DashboardHeaderContent({
  onMenuClick,
}: DashboardHeaderProps) {
  const pathname = usePathname();
  const pageTitle = pageNames[pathname] || "Dashboard";

  return (
    <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-[#eae6df] bg-white/95 px-4 backdrop-blur-md sm:px-6 lg:px-9">
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={onMenuClick}
          aria-label="Open navigation"
          className="rounded-lg p-2 text-[#111111] transition hover:bg-[#f4f1ec] lg:hidden"
        >
          <Menu size={22} />
        </button>

        <div className="min-w-0">
          <div className="hidden items-center gap-2 text-[10px] tracking-[0.14em] text-[#9a948b] sm:flex">
            <span>HOVER UP</span>
            <ChevronRight size={12} />
            <span>WORKSPACE</span>
          </div>

          <h1 className="truncate text-lg font-semibold tracking-tight text-[#111111] sm:mt-1 sm:text-xl">
            {pageTitle}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <div className="hidden h-10 w-[220px] items-center gap-2 rounded-xl border border-[#eae6df] bg-[#faf9f7] px-3 md:flex lg:w-[270px]">
          <Search size={16} className="text-[#999187]" />

          <input
            type="search"
            placeholder="Search dashboard..."
            className="w-full bg-transparent text-xs text-[#111111] outline-none placeholder:text-[#aaa39a]"
          />

          <span className="rounded border border-[#e5e0d8] px-1.5 py-0.5 text-[9px] text-[#999187]">
            /
          </span>
        </div>

        <button
          aria-label="Notifications"
          className="relative rounded-xl p-2.5 text-[#55514b] transition hover:bg-[#f4f1ec]"
        >
          <Bell size={19} strokeWidth={1.8} />

          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#b99a76]" />
        </button>


        <div className="ml-1 flex items-center gap-2.5 border-l border-[#eae6df] pl-3 sm:pl-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e8e0d5] text-xs font-semibold text-[#493b2d]">
            AD
          </div>

          <div className="hidden sm:block">
            <p className="text-xs font-semibold text-[#222222]">
              Administrator
            </p>

            <p className="mt-0.5 text-[10px] text-[#999187]">
              Admin account
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}

export default function DashboardHeader(
  props: DashboardHeaderProps
) {
  return (
    <Suspense
      fallback={
        <header className="sticky top-0 z-30 h-[76px] border-b border-[#eae6df] bg-white" />
      }
    >
      <DashboardHeaderContent {...props} />
    </Suspense>
  );
}
