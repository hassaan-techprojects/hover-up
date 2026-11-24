"use client";

import { useEffect, useState } from "react";
import DashboardSidebar from "./dashboard-sidebar";
import DashboardHeader from "./dashboard-header";

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <div data-dashboard-shell className="min-h-screen bg-[#f8f6f2]">
      <DashboardSidebar
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />

      <div className="min-h-screen lg:pl-[270px]">
        <DashboardHeader onMenuClick={() => setMenuOpen(true)} />

        <main className="mx-auto w-full max-w-[1600px] min-w-0 p-3 sm:p-5 lg:p-9">
          {children}
        </main>
      </div>
    </div>
  );
}