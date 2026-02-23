"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import type { LifeOS } from "./types";
import { loadLifeOS, saveLifeOS, ensureDayLog, ensureWeekLog, mergeData } from "./storage";
import { useOnlineStatus } from "./useOnlineStatus";
import { api } from "./api-client";

export type SyncStatus =
  | "ready"
  | "saved"
  | "syncing"
  | "synced"
  | "offline"
  | "error"
  | "sync-error";

export function useLifeOS() {
  const { data: session } = useSession();
  const isOnline = useOnlineStatus();
  const [data, setData] = useState<LifeOS | null>(null);
  const [saveStatus, setSaveStatus] = useState<SyncStatus>("ready");
  const hasSynced = useRef(false);
  const statusTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function flashStatus(status: SyncStatus) {
    setSaveStatus(status);
    clearTimeout(statusTimer.current);
    statusTimer.current = setTimeout(() => setSaveStatus("ready"), 2000);
  }

  // Initial load: localStorage first, then sync from server if logged in
  useEffect(() => {
    let lifeOS = loadLifeOS();
    lifeOS = ensureDayLog(lifeOS);
    lifeOS = ensureWeekLog(lifeOS);
    if (!lifeOS.weightEntries) lifeOS.weightEntries = [];
    if (!lifeOS.pools) lifeOS.pools = { philosophyLines: [] };
    if (!lifeOS.dailySelections) lifeOS.dailySelections = {};
    saveLifeOS(lifeOS);
    setData(lifeOS);
  }, []);

  // Sync from server once when session becomes available
  useEffect(() => {
    if (!session?.user || !isOnline || hasSynced.current || !data) return;
    hasSynced.current = true;

    setSaveStatus("syncing");
    api
      .syncPull()
      .then((serverData) => {
        const merged = mergeData(data, serverData);
        saveLifeOS(merged);
        setData(merged);
        flashStatus("synced");
      })
      .catch(() => {
        flashStatus("sync-error");
      });
  }, [session, isOnline, data]);

  // Push to server when coming back online
  useEffect(() => {
    if (!isOnline || !session?.user || !data) return;

    const pendingPush = typeof window !== "undefined"
      ? localStorage.getItem("dyna_os_pending_sync")
      : null;

    if (pendingPush === "true") {
      setSaveStatus("syncing");
      api
        .syncPush(data)
        .then(() => {
          localStorage.removeItem("dyna_os_pending_sync");
          flashStatus("synced");
        })
        .catch(() => flashStatus("sync-error"));
    }
  }, [isOnline, session, data]);

  const update = useCallback(
    (updater: (current: LifeOS) => LifeOS) => {
      setData((prev) => {
        if (!prev) return prev;
        const next = updater(prev);
        const success = saveLifeOS(next);
        flashStatus(success ? "saved" : "error");

        // Background sync to server
        if (session?.user) {
          if (isOnline) {
            api
              .syncPush(next)
              .then(() => flashStatus("synced"))
              .catch(() => {
                localStorage.setItem("dyna_os_pending_sync", "true");
                flashStatus("sync-error");
              });
          } else {
            localStorage.setItem("dyna_os_pending_sync", "true");
            flashStatus("offline");
          }
        }

        return next;
      });
    },
    [session, isOnline]
  );

  return { data, update, saveStatus };
}
