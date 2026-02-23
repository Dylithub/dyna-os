"use client";

import { useState, useEffect, useRef } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [show, setShow] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const dismissed = sessionStorage.getItem("dyna_os_install_dismissed");
    if (dismissed) return;

    function handler(e: Event) {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setShow(true);
    }

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt.current) return;
    await deferredPrompt.current.prompt();
    const { outcome } = await deferredPrompt.current.userChoice;
    if (outcome === "accepted") {
      setShow(false);
    }
    deferredPrompt.current = null;
  }

  function handleDismiss() {
    setShow(false);
    sessionStorage.setItem("dyna_os_install_dismissed", "true");
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-16 left-4 right-4 border border-terminal-border bg-terminal-surface p-3 z-[600] flex items-center justify-between gap-2">
      <span className="text-terminal text-xs tracking-wider">
        {">"} INSTALL DYNA OS
      </span>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={handleInstall}
          className="px-3 py-1.5 text-[10px] tracking-wider font-mono
            border border-terminal bg-terminal-active text-terminal-bright
            cursor-pointer"
        >
          INSTALL
        </button>
        <button
          onClick={handleDismiss}
          className="px-3 py-1.5 text-[10px] tracking-wider font-mono
            border border-terminal-border text-terminal-dim cursor-pointer"
        >
          LATER
        </button>
      </div>
    </div>
  );
}
