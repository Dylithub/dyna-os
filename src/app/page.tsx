"use client";

// This is the main page of the app.
//
// "use client" is needed because this component uses React hooks
// (useState for tab switching, and useLifeOS for data).
//
// In Next.js, the file at app/page.tsx renders at the root URL "/".
// This single page manages tab switching client-side (no page reloads),
// just like your original HTML app did.

import { useState, useRef } from "react";
import { useLifeOS } from "@/lib/useLifeOS";
import SyncIndicator from "@/components/SyncIndicator";
import InstallPrompt from "@/components/InstallPrompt";
import TodayTab from "@/components/tabs/TodayTab";
import ContractsTab from "@/components/tabs/ContractsTab";
import WeighInTab from "@/components/tabs/WeighInTab";
import CaloriesTab from "@/components/tabs/CaloriesTab";
import FinancesTab from "@/components/tabs/FinancesTab";
import CheckInTab from "@/components/tabs/CheckInTab";
import SettingsTab from "@/components/tabs/SettingsTab";

// Define our tabs — the id is internal, the label is what the user sees.
const TABS = [
  { id: "today", label: "TODAY" },
  { id: "contracts", label: "CONTRACTS" },
  { id: "weighin", label: "WEIGH-IN" },
  { id: "calories", label: "CALORIES" },
  { id: "finances", label: "FINANCES" },
  { id: "checkin", label: "CHECK-IN" },
  { id: "settings", label: "SETTINGS" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function Home() {
  const { data, update, saveStatus } = useLifeOS();
  const [activeTab, setActiveTab] = useState<TabId>("today");
  const tabMenuRef = useRef<HTMLDivElement>(null);

  // When a tab is clicked, scroll it into view (for the horizontal menu)
  function handleTabClick(tabId: TabId, element: HTMLElement) {
    setActiveTab(tabId);
    element.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }

  // Show loading state while data loads from localStorage
  if (!data) {
    return (
      <div
        id="terminal-frame"
        className="w-full min-h-screen bg-terminal-bg relative flex flex-col overflow-hidden"
      >
        <div className="flex-1 flex items-center justify-center text-terminal-dim">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div
      id="terminal-frame"
      className="w-full min-h-screen bg-terminal-bg relative flex flex-col overflow-hidden"
    >
      {/* Header */}
      <header className="px-5 py-4 border-b border-terminal-border bg-terminal-surface sticky top-0 z-[100]">
        <div className="text-terminal text-base tracking-widest">
          DYNA OS
        </div>
        <div className="text-terminal-dim text-[10px] mt-0.5 tracking-wider">
          FITNESS TERMINAL v2.0
        </div>
      </header>

      {/* Tab Navigation */}
      <nav
        ref={tabMenuRef}
        className="flex overflow-x-auto bg-terminal-surface border-b-2 border-terminal-border hide-scrollbar"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={(e) => handleTabClick(tab.id, e.currentTarget)}
            className={`
              px-4 py-3 text-[11px] cursor-pointer whitespace-nowrap
              border-b-[3px] transition-all tracking-wider shrink-0
              font-mono
              ${
                activeTab === tab.id
                  ? "bg-terminal-active border-b-terminal text-terminal-bright"
                  : "border-b-transparent text-terminal active:bg-terminal/20"
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="flex-1 p-4 overflow-y-auto text-terminal pb-20">
        {activeTab === "today" && <TodayTab data={data} />}
        {activeTab === "contracts" && <ContractsTab data={data} update={update} />}
        {activeTab === "weighin" && <WeighInTab data={data} update={update} />}
        {activeTab === "calories" && <CaloriesTab data={data} update={update} />}
        {activeTab === "finances" && <FinancesTab data={data} update={update} />}
        {activeTab === "checkin" && <CheckInTab data={data} update={update} />}
        {activeTab === "settings" && <SettingsTab data={data} update={update} />}
      </main>

      {/* Status indicators */}
      <InstallPrompt />
      <SyncIndicator status={saveStatus} />
    </div>
  );
}
