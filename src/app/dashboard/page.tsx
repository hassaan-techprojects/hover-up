
import Link from "next/link";
import { LayoutDashboard, Package, ShoppingBag, Users } from "lucide-react";

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-[#f8f6f2] p-6 md:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs tracking-[0.2em] text-[#b99a76]">
              HOVER UP WORKSPACE
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-[#111111]">
              Dashboard Overview
            </h1>
            <p className="mt-2 text-sm text-[#817b72]">
              Welcome to your store administration workspace.
            </p>
          </div>

          <Link
            href="/"
            className="rounded-lg bg-[#111111] px-5 py-3 text-sm text-white"
          >
            Visit Store
          </Link>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { title: "Total Products", icon: Package },
            { title: "Total Orders", icon: ShoppingBag },
            { title: "Total Customers", icon: Users },
            { title: "Workspace", icon: LayoutDashboard },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="rounded-xl border border-[#e8e2d9] bg-white p-6"
              >
                <Icon size={22} className="text-[#b99a76]" />
                <p className="mt-5 text-sm text-[#817b72]">
                  {item.title}
                </p>
                <p className="mt-2 text-2xl font-semibold text-[#111111]">
                  --
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
