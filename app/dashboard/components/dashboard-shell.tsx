"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "./sidebar";

type DashboardShellProps = {
  householdName?: string;
  initialSidebarCollapsed: boolean;
  initialSurplusDeltaPence: number;
  children: React.ReactNode;
};

export function DashboardShell({
  householdName,
  initialSidebarCollapsed,
  initialSurplusDeltaPence,
  children,
}: DashboardShellProps) {
  const router = useRouter();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(initialSidebarCollapsed);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isMobileSidebarVisible, setIsMobileSidebarVisible] = useState<boolean>(false);
  const [surplusDeltaPence, setSurplusDeltaPence] = useState<number>(initialSurplusDeltaPence);

  function formatPounds(pence: number): string {
    return `£${(pence / 100).toFixed(2)}`;
  }

  function toggleSidebar() {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem("rail.sidebar.collapsed", String(next));
      document.cookie = `rail.sidebar.collapsed=${String(next)}; path=/; max-age=31536000; samesite=lax`;
      return next;
    });
  }

  function persistSurplusDelta(next: number) {
    window.localStorage.setItem("rail.scenario.surplus_delta", String(next));
    document.cookie = `rail.scenario.surplus_delta=${next}; path=/; max-age=31536000; samesite=lax`;
  }

  function onSliderChange(next: number) {
    setSurplusDeltaPence(next);
    persistSurplusDelta(next);
  }

  function applyScenario() {
    router.refresh();
  }

  function resetScenario() {
    onSliderChange(0);
    router.refresh();
  }

  function openMobileSidebar() {
    setIsMobileSidebarVisible(true);
    requestAnimationFrame(() => setIsMobileSidebarOpen(true));
  }

  function closeMobileSidebar() {
    setIsMobileSidebarOpen(false);
    window.setTimeout(() => setIsMobileSidebarVisible(false), 220);
  }

  return (
    <div className="min-h-screen bg-white">
      <div
        className={`min-h-screen lg:grid ${isSidebarCollapsed ? "lg:grid-cols-[76px_1fr]" : "lg:grid-cols-[272px_1fr]"}`}
      >
        <div className="hidden lg:block lg:h-screen lg:overflow-y-auto">
          <Sidebar isCollapsed={isSidebarCollapsed} onToggle={toggleSidebar} householdName={householdName} />
        </div>
        <section className="space-y-4 bg-white p-5 lg:p-6">
          <div className="flex items-center justify-between lg:hidden">
            <button
              type="button"
              onClick={openMobileSidebar}
              aria-label="Open menu"
              className="inline-flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                <path fill="currentColor" d="M4 6h16v2H4V6Zm0 5h16v2H4v-2Zm0 5h16v2H4v-2Z" />
              </svg>
              Menu
            </button>
            <p className="text-sm font-semibold tracking-tight text-zinc-800">Rail</p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-zinc-900">Scenario control</p>
                <p className="text-xs text-zinc-600">
                  Adjust monthly surplus to preview how recommendations shift.
                </p>
              </div>
              <p className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-800">
                Surplus delta: {surplusDeltaPence >= 0 ? "+" : ""}
                {formatPounds(surplusDeltaPence)}
              </p>
            </div>
            <div className="mt-3">
              <input
                type="range"
                min={-30000}
                max={50000}
                step={1000}
                value={surplusDeltaPence}
                onChange={(e) => onSliderChange(Number(e.target.value))}
                onMouseUp={applyScenario}
                onTouchEnd={applyScenario}
                className="w-full"
                aria-label="Monthly surplus scenario adjustment"
              />
              <div className="relative mt-2 h-4 text-xs text-zinc-500">
                <span className="absolute left-0">-£300.00</span>
                <span className="absolute left-[37.5%] -translate-x-1/2">£0.00</span>
                <span className="absolute right-0">+£500.00</span>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={applyScenario}
                className="rounded-md bg-black px-3 py-2 text-xs font-medium text-white"
              >
                Apply scenario
              </button>
              <button
                type="button"
                onClick={resetScenario}
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-700"
              >
                Reset
              </button>
            </div>
          </div>
          {children}
        </section>
      </div>

      {isMobileSidebarVisible ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            onClick={closeMobileSidebar}
            className={`absolute inset-0 bg-black/30 transition-opacity duration-200 ${
              isMobileSidebarOpen ? "opacity-100" : "opacity-0"
            }`}
            aria-label="Close menu overlay"
          />
          <div
            className={`relative h-full w-[280px] max-w-[85vw] transition-transform duration-200 ease-out ${
              isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <Sidebar
              isCollapsed={false}
              onToggle={closeMobileSidebar}
              householdName={householdName}
              showCollapseToggle={false}
              onNavigate={closeMobileSidebar}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

