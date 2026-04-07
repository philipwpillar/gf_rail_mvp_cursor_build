"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { ReactNode } from "react";

type NavItem = {
  label: string;
  short: string;
  href: string;
  icon: ReactNode;
};

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    short: "D",
    href: "/dashboard",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path fill="currentColor" d="M3 3h8v8H3V3Zm10 0h8v5h-8V3ZM3 13h5v8H3v-8Zm7 0h11v8H10v-8Z" />
      </svg>
    ),
  },
  {
    label: "Resilience",
    short: "R",
    href: "/dashboard/resilience",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z"
        />
      </svg>
    ),
  },
  {
    label: "Debt",
    short: "D",
    href: "/dashboard/debt",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path
          fill="currentColor"
          d="M2 6h20v12H2V6Zm2 2v8h16V8H4Zm2 2h6v2H6v-2Zm0 3h10v2H6v-2Z"
        />
      </svg>
    ),
  },
  {
    label: "Ownership",
    short: "O",
    href: "/dashboard/ownership",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path fill="currentColor" d="M4 4h16v2H4V4Zm0 5h10v2H4V9Zm0 5h16v2H4v-2Zm0 5h10v2H4v-2Z" />
      </svg>
    ),
  },
];

type SidebarProps = {
  isCollapsed: boolean;
  householdName?: string;
  onToggle: () => void;
  showCollapseToggle?: boolean;
  onNavigate?: () => void;
};

export function Sidebar({
  isCollapsed,
  householdName,
  onToggle,
  showCollapseToggle = true,
  onNavigate,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    onNavigate?.();
    router.push("/login");
  }

  return (
    <aside className="flex h-full flex-col border-r border-zinc-200 bg-zinc-50 text-zinc-900 transition-all duration-200">
      <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-3">
        {!isCollapsed ? (
          <div>
            <p className="type-section-title tracking-tight">Rail</p>
            <p className="type-caption text-zinc-500">Household CFO Platform</p>
          </div>
        ) : (
          <p className="rounded-md bg-zinc-200 px-2 py-1 text-xs font-semibold">R</p>
        )}
        {showCollapseToggle ? (
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={!isCollapsed}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="rounded-md border border-zinc-300 bg-white px-2 py-1 type-caption text-zinc-600 hover:bg-zinc-100"
          >
            {isCollapsed ? ">" : "<"}
          </button>
        ) : null}
      </div>

      <nav className="space-y-1 px-2 py-3 text-sm">
        {!isCollapsed ? (
          <p className="px-2 pb-1 type-label text-zinc-500">Workspace</p>
        ) : null}
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center rounded-md px-3 py-2 ${
                isActive
                  ? "bg-zinc-900 font-medium text-white"
                  : "text-zinc-700 hover:bg-zinc-100"
              } ${isCollapsed ? "justify-center" : "gap-2"}`}
              title={item.label}
            >
              <span className={`inline-flex items-center justify-center ${isActive ? "text-white" : "text-zinc-500"}`}>
                {item.icon}
              </span>
              {isCollapsed ? <span className="sr-only">{item.short}</span> : <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-zinc-200 px-3 pb-3 pt-3 text-xs text-zinc-500">
        {!isCollapsed ? (
          <>
            <p className="type-label text-zinc-500">Household</p>
            <p className="mt-1 truncate type-body text-zinc-800">{householdName ?? "Loading..."}</p>
          </>
        ) : null}
        <button
          type="button"
          onClick={handleSignOut}
          className="mt-3 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 type-button-xs text-zinc-700 hover:bg-zinc-100"
        >
          {isCollapsed ? "Out" : "Sign out"}
        </button>
      </div>
    </aside>
  );
}
