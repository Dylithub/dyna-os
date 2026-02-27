"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import type { LifeOS } from "@/lib/types";
import { getTodayKey } from "@/lib/dates";
import { exportDataToJSON, importDataFromJSON, getSettings } from "@/lib/storage";
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
  const settings = getSettings(data);

  function updateSetting<K extends keyof typeof settings>(key: K, value: number | string | string[]) {
    update((current) => ({
      ...current,
      settings: {
        ...getSettings(current),
        [key]: value,
      },
    }));
  }

  function updateStrengthLabel(index: number, label: string) {
    const newLabels = [...settings.strengthLabels];
    newLabels[index] = label;
    updateSetting("strengthLabels", newLabels);
  }

  function handleStrengthSessionsChange(count: number) {
    const currentLabels = settings.strengthLabels;
    let newLabels: string[];

    if (count > currentLabels.length) {
      // Add new empty labels
      newLabels = [...currentLabels];
      for (let i = currentLabels.length; i < count; i++) {
        newLabels.push(`Session ${i + 1}`);
      }
    } else {
      // Trim labels to match count
      newLabels = currentLabels.slice(0, count);
    }

    update((current) => ({
      ...current,
      settings: {
        ...getSettings(current),
        strengthSessions: count,
        strengthLabels: newLabels,
      },
    }));
  }

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

      <TerminalCard title="TARGETS">
        <div className="text-terminal-dim text-[10px] mb-3">NUTRITION</div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-terminal-dim text-[10px] block mb-1">CALORIES (kcal)</label>
            <input
              type="number"
              value={settings.calorieTarget}
              onChange={(e) => updateSetting("calorieTarget", parseInt(e.target.value) || 0)}
              className="!p-2 !text-xs w-full"
            />
          </div>
          <div>
            <label className="text-terminal-dim text-[10px] block mb-1">PROTEIN (g)</label>
            <input
              type="number"
              value={settings.proteinTarget}
              onChange={(e) => updateSetting("proteinTarget", parseInt(e.target.value) || 0)}
              className="!p-2 !text-xs w-full"
            />
          </div>
        </div>

        <div className="text-terminal-dim text-[10px] mb-3">WEIGHT</div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-terminal-dim text-[10px] block mb-1">TARGET (lb)</label>
            <input
              type="number"
              value={settings.targetWeight}
              onChange={(e) => updateSetting("targetWeight", parseInt(e.target.value) || 0)}
              className="!p-2 !text-xs w-full"
            />
          </div>
          <div>
            <label className="text-terminal-dim text-[10px] block mb-1">TARGET DATE</label>
            <input
              type="date"
              value={settings.targetWeightDate || ""}
              onChange={(e) => updateSetting("targetWeightDate", e.target.value)}
              className="!p-2 !text-xs w-full"
            />
          </div>
        </div>

        <div className="text-terminal-dim text-[10px] mb-3">DAILY SPENDING</div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-terminal-dim text-[10px] block mb-1">WEEKDAY ($)</label>
            <input
              type="number"
              value={settings.weekdaySpendTarget}
              onChange={(e) => updateSetting("weekdaySpendTarget", parseInt(e.target.value) || 0)}
              className="!p-2 !text-xs w-full"
            />
          </div>
          <div>
            <label className="text-terminal-dim text-[10px] block mb-1">WEEKEND ($)</label>
            <input
              type="number"
              value={settings.weekendSpendTarget}
              onChange={(e) => updateSetting("weekendSpendTarget", parseInt(e.target.value) || 0)}
              className="!p-2 !text-xs w-full"
            />
          </div>
        </div>

        <div className="text-terminal-dim text-[10px] mb-3">EXERCISE</div>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div>
            <label className="text-terminal-dim text-[10px] block mb-1">ZONE 2 #</label>
            <input
              type="number"
              value={settings.zone2Sessions}
              onChange={(e) => updateSetting("zone2Sessions", parseInt(e.target.value) || 0)}
              className="!p-2 !text-xs w-full"
            />
          </div>
          <div>
            <label className="text-terminal-dim text-[10px] block mb-1">ZONE 2 MIN</label>
            <input
              type="number"
              value={settings.zone2Minutes}
              onChange={(e) => updateSetting("zone2Minutes", parseInt(e.target.value) || 0)}
              className="!p-2 !text-xs w-full"
            />
          </div>
          <div>
            <label className="text-terminal-dim text-[10px] block mb-1">STRENGTH #</label>
            <input
              type="number"
              value={settings.strengthSessions}
              onChange={(e) => handleStrengthSessionsChange(parseInt(e.target.value) || 0)}
              className="!p-2 !text-xs w-full"
              min="0"
              max="10"
            />
          </div>
        </div>

        {settings.strengthSessions > 0 && (
          <>
            <div className="text-terminal-dim text-[10px] mb-3 mt-2">STRENGTH LABELS</div>
            <div className="flex flex-col gap-2">
              {Array.from({ length: settings.strengthSessions }, (_, i) => (
                <input
                  key={i}
                  type="text"
                  value={settings.strengthLabels[i] || ""}
                  onChange={(e) => updateStrengthLabel(i, e.target.value)}
                  placeholder={`Session ${i + 1}`}
                  className="!p-2 !text-xs w-full"
                />
              ))}
            </div>
          </>
        )}
      </TerminalCard>

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
