"use client";

import { useEffect, useState } from "react";

export function ElectronTitlebar() {
  const [isElectronMac, setIsElectronMac] = useState(false);

  useEffect(() => {
    const api = (window as any).electronAPI;
    if (api?.platform === "darwin") {
      setIsElectronMac(true);
      document.documentElement.classList.add("electron-mac");
    }
    return () => {
      document.documentElement.classList.remove("electron-mac");
    };
  }, []);

  if (!isElectronMac) return null;

  return (
    <div
      className="electron-drag-region fixed top-0 left-0 right-0 z-50"
      style={{ height: "var(--electron-titlebar-height)" }}
    />
  );
}
