"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import type { LifeOS } from "./types";
import { loadLifeOS, saveLifeOS, ensureDayLog, ensureWeekLog, mergeData } from "./storage";
import { ensureShoppingList } from "./shopping";
import { getISOWeekKey } from "./dates";
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

const PENDING_SYNC_KEY = "dyna_os_pending_sync";
// Rapid edits (typing, ticking several boxes) collapse into one push
const PUSH_DEBOUNCE_MS = 800;

function hasPendingSync(): boolean {
  return typeof window !== "undefined" && localStorage.getItem(PENDING_SYNC_KEY) === "true";
}

/** Stamp settings / shopping list when an edit changed them, so the newest copy wins on sync */
function stampChanges(prev: LifeOS, next: LifeOS) {
  const now = Date.now();
  if (next.settings && JSON.stringify(prev.settings) !== JSON.stringify(next.settings)) {
    next.settings.updatedAt = now;
  }
  if (next.shoppingList && JSON.stringify(prev.shoppingList) !== JSON.stringify(next.shoppingList)) {
    next.shoppingList.updatedAt = now;
  }
}

export function useLifeOS() {
  const { data: session } = useSession();
  const isOnline = useOnlineStatus();
  const [data, setData] = useState<LifeOS | null>(null);
  const [saveStatus, setSaveStatus] = useState<SyncStatus>("ready");
  const statusTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Latest data, readable synchronously. Every update builds on this rather
  // than on a captured render value, so an edit made while a server pull is
  // in flight can't be overwritten by the pull's (older) snapshot.
  const dataRef = useRef<LifeOS | null>(null);
  const signedIn = !!session?.user;

  // Push bookkeeping: at most one push in flight, always sending the latest data
  const pushTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pushInFlight = useRef(false);
  const pushAgain = useRef(false);
  const pullInFlight = useRef(false);
  const hasPulled = useRef(false);
  // Bumped on every local edit, so a pull can tell if it raced one
  const editCount = useRef(0);

  function flashStatus(status: SyncStatus) {
    setSaveStatus(status);
    clearTimeout(statusTimer.current);
    statusTimer.current = setTimeout(() => setSaveStatus("ready"), 2000);
  }

  function commit(next: LifeOS): boolean {
    dataRef.current = next;
    setData(next);
    return saveLifeOS(next);
  }

  const runPush = useCallback(async () => {
    if (!dataRef.current) return;
    if (pushInFlight.current) {
      // Another edit landed mid-push — send again once this one finishes.
      // Running pushes one at a time stops an older payload landing last
      // and overwriting a newer one on the server.
      pushAgain.current = true;
      return;
    }
    pushInFlight.current = true;
    setSaveStatus("syncing");
    try {
      do {
        pushAgain.current = false;
        await api.syncPush(dataRef.current!);
      } while (pushAgain.current);
      localStorage.removeItem(PENDING_SYNC_KEY);
      flashStatus("synced");
    } catch {
      // Flag stays set; retried on reconnect, on return to the app, or on the next edit
      flashStatus("sync-error");
    } finally {
      pushInFlight.current = false;
    }
  }, []);

  const schedulePush = useCallback(() => {
    clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(runPush, PUSH_DEBOUNCE_MS);
  }, [runPush]);

  /** Pull from the server and merge into the latest local data */
  const pull = useCallback(async () => {
    if (pullInFlight.current) return;
    pullInFlight.current = true;
    setSaveStatus("syncing");
    const editsBefore = editCount.current;
    try {
      const serverData = await api.syncPull();
      if (!dataRef.current) return;
      // Local edits the server hasn't seen yet (made mid-pull, or a push that
      // failed): merging would let the server's older values win. Skip it; the
      // push follows and the next pull (on return to the app) catches up.
      if (editCount.current !== editsBefore || hasPendingSync()) {
        flashStatus("saved");
        return;
      }
      commit(ensureShoppingList(mergeData(dataRef.current, serverData)));
      flashStatus("synced");
    } catch {
      flashStatus("sync-error");
    } finally {
      pullInFlight.current = false;
    }
  }, []);

  // Initial load from localStorage
  useEffect(() => {
    let lifeOS = loadLifeOS();
    lifeOS = ensureDayLog(lifeOS);
    lifeOS = ensureWeekLog(lifeOS);
    lifeOS = ensureShoppingList(lifeOS);
    if (!lifeOS.weightEntries) lifeOS.weightEntries = [];
    if (!lifeOS.pools) lifeOS.pools = { philosophyLines: [] };
    if (!lifeOS.dailySelections) lifeOS.dailySelections = {};
    commit(lifeOS);
  }, []);

  // Once signed in: push anything left unsynced, then pull the server copy
  useEffect(() => {
    if (!signedIn || !isOnline || !data || hasPulled.current) return;
    hasPulled.current = true;
    if (hasPendingSync()) {
      // Only pull once local edits are safely on the server
      runPush().then(() => {
        if (!hasPendingSync()) pull();
      });
    } else {
      pull();
    }
  }, [signedIn, isOnline, data, pull, runPush]);

  // Back online with unsynced edits → push them
  useEffect(() => {
    if (isOnline && signedIn && hasPulled.current && hasPendingSync()) {
      runPush();
    }
  }, [isOnline, signedIn, runPush]);

  // Returning to the app (phone unlocked, tab refocused): roll the shopping
  // list over if a new week started, then catch up with other devices
  useEffect(() => {
    function onVisible() {
      if (!dataRef.current) return;
      if (document.visibilityState === "hidden") {
        // Leaving the app: don't wait out the debounce, the OS may suspend us
        if (signedIn && hasPendingSync()) {
          clearTimeout(pushTimer.current);
          runPush();
        }
        return;
      }
      if (dataRef.current.shoppingList?.checkedWeekKey !== getISOWeekKey()) {
        commit(ensureShoppingList(structuredClone(dataRef.current)));
      }
      if (!signedIn || !navigator.onLine) return;
      if (hasPendingSync()) {
        runPush();
      } else {
        pull();
      }
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [signedIn, pull, runPush]);

  const update = useCallback(
    (updater: (current: LifeOS) => LifeOS) => {
      const prev = dataRef.current;
      if (!prev) return;
      // Clone before applying: updaters mutate in place (ensureDayLog etc.)
      const next = updater(structuredClone(prev));
      editCount.current++;
      stampChanges(prev, next);
      const success = commit(next);
      flashStatus(success ? "saved" : "error");

      if (signedIn) {
        // Marked pending before the push so a closed app still retries next launch
        localStorage.setItem(PENDING_SYNC_KEY, "true");
        if (isOnline) {
          schedulePush();
        } else {
          flashStatus("offline");
        }
      }
    },
    [signedIn, isOnline, schedulePush]
  );

  return { data, update, saveStatus };
}
