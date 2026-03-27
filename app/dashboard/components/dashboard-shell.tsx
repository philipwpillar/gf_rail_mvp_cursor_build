"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";

type DashboardShellProps = {
  householdName?: string;
  initialSidebarCollapsed: boolean;
  children: React.ReactNode;
};

export function DashboardShell({
  householdName,
  initialSidebarCollapsed,
  children,
}: DashboardShellProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(initialSidebarCollapsed);

  function toggleSidebar() {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem("rail.sidebar.collapsed", String(next));
      document.cookie = `rail.sidebar.collapsed=${String(next)}; path=/; max-age=31536000; samesite=lax`;
      return next;
    });
  }

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50">
      <div
        className={`grid min-h-[760px] grid-cols-1 ${isSidebarCollapsed ? "lg:grid-cols-[84px_1fr]" : "lg:grid-cols-[260px_1fr]"}`}
      >
        <Sidebar isCollapsed={isSidebarCollapsed} onToggle={toggleSidebar} householdName={householdName} />
        <section className="bg-zinc-50 p-5">{children}</section>
      </div>
    </div>
  );
}

