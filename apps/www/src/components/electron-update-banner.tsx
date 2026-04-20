"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type UpdatePayload = { version?: string };

type ElectronUpdateAPI = {
  onUpdateAvailable?: (cb: (payload: UpdatePayload) => void) => () => void;
  downloadAndInstallUpdate?: () => Promise<{ ok?: boolean; error?: string }>;
};

function getUpdateApi(): ElectronUpdateAPI | null {
  if (typeof window === "undefined") return null;
  const api = (window as unknown as { electronAPI?: ElectronUpdateAPI }).electronAPI;
  return api?.onUpdateAvailable && api?.downloadAndInstallUpdate ? api : null;
}

export function ElectronUpdateBanner() {
  const [open, setOpen] = useState(false);
  const [version, setVersion] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const api = getUpdateApi();
    if (!api?.onUpdateAvailable) return undefined;

    return api.onUpdateAvailable((payload) => {
      setVersion(typeof payload?.version === "string" ? payload.version : "");
      setError(null);
      setOpen(true);
    });
  }, []);

  const handleIgnore = useCallback(() => {
    setOpen(false);
    setError(null);
  }, []);

  const handleUpdate = useCallback(async () => {
    const api = getUpdateApi();
    if (!api?.downloadAndInstallUpdate) return;
    setDownloading(true);
    setError(null);
    try {
      const result = await api.downloadAndInstallUpdate();
      if (!result?.ok) {
        setError(result?.error ?? "Update failed.");
        setDownloading(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed.");
      setDownloading(false);
    }
  }, []);

  if (!open) return null;

  return (
    <div
      className={cn(
        "electron-no-drag fixed bottom-4 right-4 z-[80] flex max-w-sm flex-col gap-3 rounded-lg border border-black/10 bg-background p-4 shadow-lg dark:border-white/10",
      )}
      role="status"
    >
      <p className="text-sm font-medium text-foreground">Update available.</p>
      {version ? (
        <p className="text-xs text-muted-foreground">Version {version}</p>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" size="sm" disabled={downloading} onClick={handleIgnore}>
          Ignore
        </Button>
        <Button type="button" size="sm" disabled={downloading} onClick={handleUpdate}>
          {downloading ? "Updating…" : "Update"}
        </Button>
      </div>
    </div>
  );
}
