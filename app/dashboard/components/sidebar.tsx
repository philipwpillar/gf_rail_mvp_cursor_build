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
  {
    label: "Execution Log",
    short: "EL",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path
          fill="currentColor"
          d="M6 2h9l5 5v15H6V2Zm8 1.5V8h4.5L14 3.5ZM8 10h8v2H8v-2Zm0 4h8v2H8v-2Zm0 4h5v2H8v-2Z"
        />
      </svg>
    ),
  },
];

type SidebarProps = {
  isCollapsed: boolean;
  householdName?: string;
  onToggle: () => void;
};

export function Sidebar({ isCollapsed, householdName, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside className="border-r border-zinc-200 bg-[#0f2240] text-zinc-100 transition-all duration-200">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
        {!isCollapsed ? (
          <div>
            <p className="text-lg font-semibold tracking-wide">RAIL CFO</p>
            <p className="text-xs text-zinc-300">Household planning workspace</p>
          </div>
        ) : (
          <p className="text-lg font-semibold tracking-wide">RC</p>
        )}
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!isCollapsed}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="rounded-md border border-white/20 px-2 py-1 text-xs text-zinc-200 hover:bg-white/10"
        >
          {isCollapsed ? ">" : "<"}
        </button>
      </div>

      <nav className="space-y-1 px-3 py-4 text-sm">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center rounded-md px-3 py-2 ${
                isActive ? "bg-white/10 font-medium text-zinc-100" : "text-zinc-300 hover:bg-white/5"
              } ${isCollapsed ? "justify-center" : "gap-2"}`}
              title={item.label}
            >
              <span className="inline-flex items-center justify-center text-zinc-200">{item.icon}</span>
              {isCollapsed ? <span className="sr-only">{item.short}</span> : <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="mt-8 px-5 pb-4 text-xs text-zinc-400">
        {!isCollapsed ? (
          <>
            <p className="font-medium uppercase tracking-wide text-zinc-300">Household</p>
            <p className="mt-1 text-sm text-zinc-200">{householdName ?? "Loading..."}</p>
          </>
        ) : null}
        <button
          type="button"
          onClick={handleSignOut}
          className="mt-4 w-full rounded-md border border-white/20 px-3 py-2 text-xs font-medium text-zinc-100 hover:bg-white/10"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
