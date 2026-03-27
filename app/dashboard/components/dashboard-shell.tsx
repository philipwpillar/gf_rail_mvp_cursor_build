"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";

type DashboardShellProps = {
  householdName?: string;
  children: React.ReactNode;
};

export function DashboardShell({ householdName, children }: DashboardShellProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("rail.sidebar.collapsed") === "true";
  });

  function toggleSidebar() {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem("rail.sidebar.collapsed", String(next));
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

