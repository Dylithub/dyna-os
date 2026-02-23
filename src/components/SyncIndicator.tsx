"use client";

import type { SyncStatus } from "@/lib/useLifeOS";

interface SyncIndicatorProps {
  status: SyncStatus;
}

const STATUS_MAP: Record<SyncStatus, { text: string; style: string }> = {
  ready: { text: "Ready", style: "text-terminal-dim" },
  saved: { text: "Saved", style: "text-terminal" },
  syncing: { text: "Syncing...", style: "text-terminal animate-pulse" },
  synced: { text: "Synced", style: "text-terminal-bright" },
  offline: { text: "Offline", style: "text-terminal-warning" },
  error: { text: "Error!", style: "text-terminal-warning" },
  "sync-error": { text: "Sync Failed", style: "text-terminal-warning" },
};

export default function SyncIndicator({ status }: SyncIndicatorProps) {
  const { text, style } = STATUS_MAP[status];

  return (
    <div
      className={`fixed bottom-5 right-5 border rounded px-3 py-2 text-[10px] z-[500]
        border-terminal-border bg-terminal-surface ${style}`}
    >
      {text}
    </div>
  );
}
