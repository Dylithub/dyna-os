"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import type { LifeOS } from "@/lib/types";
import { getTodayKey } from "@/lib/dates";
import { exportDataToJSON, importDataFromJSON } from "@/lib/storage";
import { api } from "@/lib/api-client";
import TerminalCard from "@/components/TerminalCard";
import TerminalButton from "@/components/TerminalButton";

interface SettingsTabProps {
  data: LifeOS;
  update: (updater: (current: LifeOS) => LifeOS) => void;
}

export default function SettingsTab({ data, update }: SettingsTabProps) {
  const { data: session } = useSession();
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [syncing, setSyncing] = useState(false);

  const dataSize = JSON.stringify(data).length;
  const dayCount = Object.keys(data.dayLogs).length;
  const weekCount = Object.keys(data.weekLogs).length;

  function handleExport() {
    const json = exportDataToJSON(data);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dyna-os-${getTodayKey()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport() {
    try {
      const imported = importDataFromJSON(importText, data);
      update(() => imported);
      setShowImport(false);
      setImportText("");
      alert("Data imported successfully!");
    } catch (e) {
      alert("Import failed: " + (e instanceof Error ? e.message : "Unknown error"));
    }
  }

  async function handleSyncNow() {
    setSyncing(true);
    try {
      await api.syncPush(data);
      localStorage.removeItem("dyna_os_pending_sync");
      alert("Data synced to server!");
    } catch {
      alert("Sync failed. Try again later.");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <>
      <div className="text-base text-terminal-bright tracking-widest mb-4 pb-2.5 border-b border-terminal-border">
        SETTINGS
      </div>

      {session?.user && (
        <TerminalCard title="ACCOUNT">
          <div className="flex justify-between items-center py-2 border-b border-terminal/10">
            <span className="text-terminal-dim text-xs">SIGNED IN AS</span>
            <span className="text-terminal text-xs truncate ml-2">
              {session.user.email}
            </span>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <TerminalButton onClick={handleSyncNow} small>
              {syncing ? "SYNCING..." : "SYNC NOW"}
            </TerminalButton>
            <TerminalButton onClick={() => signOut()} small>
              SIGN OUT
            </TerminalButton>
          </div>
        </TerminalCard>
      )}

      <TerminalCard title="DATA SUMMARY">
        {[
          { label: "VERSION", value: String(data.meta.version) },
          { label: "CREATED", value: data.meta.createdAt?.split("T")[0] || "Unknown" },
          { label: "DAY LOGS", value: String(dayCount) },
          { label: "WEEK LOGS", value: String(weekCount) },
          { label: "WEIGHT ENTRIES", value: String(data.weightEntries.length) },
          { label: "DATA SIZE", value: `${(dataSize / 1024).toFixed(1)} KB` },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between items-center py-2 border-b border-terminal/10">
            <span className="text-terminal-dim text-xs">{label}</span>
            <span className="text-terminal text-xs">{value}</span>
          </div>
        ))}
      </TerminalCard>

      <TerminalCard title="EXPORT / IMPORT">
        <div className="flex flex-wrap gap-2 mt-2">
          <TerminalButton onClick={handleExport}>EXPORT DATA</TerminalButton>
          <TerminalButton onClick={() => setShowImport(!showImport)}>
            IMPORT DATA
          </TerminalButton>
        </div>
      </TerminalCard>

      {showImport && (
        <TerminalCard title="IMPORT DATA">
          <div className="mb-4">
            <label className="text-terminal-dim text-[11px] block mb-1 tracking-wider">
              PASTE JSON DATA
            </label>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              className="!min-h-[150px]"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <TerminalButton onClick={handleImport}>IMPORT</TerminalButton>
            <TerminalButton onClick={() => setShowImport(false)}>CANCEL</TerminalButton>
          </div>
        </TerminalCard>
      )}
    </>
  );
}
