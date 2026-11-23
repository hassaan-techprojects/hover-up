
"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  LayoutDashboard,
  ChartNoAxesCombined,
  Package,
  Tags,
  SlidersHorizontal,
  ShoppingBag,
  Users,
  Warehouse,
  Truck,
  Images,
  TicketPercent,
  Megaphone,
  Star,
  FileChartColumn,
  ShieldCheck,
  Settings,
  History,
  X,
  ArrowUpRight,
} from "lucide-react";

const navigation = [
  {
    label: "WORKSPACE",
    items: [
      { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
      { name: "Analytics", href: "/dashboard/analytics", icon: ChartNoAxesCombined },
    ],
  },
  {
    label: "CATALOGUE",
    items: [
      { name: "Products", href: "/dashboard/products", icon: Package },
      { name: "Categories", href: "/dashboard/categories", icon: Tags },
      { name: "Attributes", href: "/dashboard/attributes", icon: SlidersHorizontal },
      { name: "Inventory", href: "/dashboard/inventory", icon: Warehouse },
      { name: "Banners & Media", href: "/dashboard/banners", icon: Images },
    ],
  },
  {
    label: "COMMERCE",
    items: [
      { name: "Orders", href: "/dashboard/orders", icon: ShoppingBag },
      { name: "Customers", href: "/dashboard/customers", icon: Users },
      { name: "Shipping", href: "/dashboard/shipping", icon: Truck },
      { name: "Discounts", href: "/dashboard/discounts", icon: TicketPercent },
    ],
  },
  {
    label: "GROWTH",
    items: [
      { name: "Marketing", href: "/dashboard/marketing", icon: Megaphone },
      { name: "Reviews", href: "/dashboard/reviews", icon: Star },
      { name: "Reports", href: "/dashboard/reports", icon: FileChartColumn },
    ],
  },
  {
    label: "MANAGEMENT",
    items: [
      { name: "Team & Roles", href: "/dashboard/team", icon: ShieldCheck },
      { name: "Settings", href: "/dashboard/settings", icon: Settings },
      { name: "Activity Logs", href: "/dashboard/activity-logs", icon: History },
    ],
  },
];

type DashboardSidebarProps = {
  open: boolean;
  onClose: () => void;
};

function DashboardSidebarContent({
  open,
  onClose,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/me", { cache: "no-store" })
      .then(response => response.json())
      .then(data => setRole(data.role || "CUSTOMER"))
      .catch(() => setRole("CUSTOMER"));
  }, []);

  const visibleNavigation = role === "ANALYST"
    ? navigation.filter(section => section.label === "CATALOGUE").map(section => ({
        ...section,
        items: section.items.filter(item => ["Products", "Categories", "Attributes", "Banners & Media"].includes(item.name)),
      }))
    : navigation;

  return (
    <>
      {open && (
        <button
          aria-label="Close navigation overlay"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[270px] flex-col bg-[#111111] text-white transition-transform duration-300 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-[82px] items-center justify-between border-b border-white/10 px-5">
          <Link
            href="/dashboard"
            onClick={onClose}
            className="flex items-center gap-3"
          >
            <Image
              src="/hu.png"
              alt="Hover Up logo"
              width={42}
              height={42}
              priority
              className="h-[42px] w-[42px] shrink-0 object-contain"
            />

            <span className="text-[21px] font-black tracking-[0.12em]">
              HOVER UP<span className="text-[#b99a76]">.</span>
            </span>
          </Link>

          <button
            onClick={onClose}
            aria-label="Close menu"
            className="rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6">
          {visibleNavigation.map((section) => (
            <div key={section.label} className="mb-7">
              <p className="mb-3 px-3 text-[10px] font-semibold tracking-[0.2em] text-white/35">
                {section.label}
              </p>

              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;

                  const active =
                    pathname === item.href ||
                    (item.href !== "/dashboard" &&
                      pathname.startsWith(`${item.href}/`));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition-all duration-200 ${
                        active
                          ? "bg-[#b99a76] text-[#111111]"
                          : "text-white/65 hover:bg-white/8 hover:text-white"
                      }`}
                    >
                      <Icon
                        size={17}
                        strokeWidth={1.8}
                        className="shrink-0"
                      />

                      <span className="flex-1">{item.name}</span>

                      {active && (
                        <span className="h-1.5 w-1.5 rounded-full bg-[#111111]" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {role !== "ANALYST" && <div className="border-t border-white/10 p-4">
          <div className="rounded-xl bg-white/[0.06] p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] tracking-[0.15em] text-white/45">
                STOREFRONT
              </span>
              <ArrowUpRight size={14} className="text-[#b99a76]" />
            </div>

            <Link
              href="/"
              target="_blank"
              className="mt-2 block text-sm text-white transition hover:text-[#b99a76]"
            >
              View your website
            </Link>
          </div>
        </div>}
      </aside>
    </>
  );
}

export default function DashboardSidebar(props: DashboardSidebarProps) {
  return (
    <Suspense fallback={<div className="w-[270px]" />}>
      <DashboardSidebarContent {...props} />
    </Suspense>
  );
}
