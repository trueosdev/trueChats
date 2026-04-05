"use client";

import { useEffect, useState } from "react";
import { FolderInput, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { THREAD_FOLDER_NAME_MAX_CHARS } from "@/lib/thread-field-limits";

/**
 * Compact card styled like the new-chat popover: name a folder (create or rename).
 */
export function FolderNameCard({
  variant,
  initialName = "",
  onClose,
  onConfirm,
  busy = false,
}: {
  variant: "create" | "rename";
  initialName?: string;
  onClose: () => void;
  onConfirm: (trimmedName: string) => void | Promise<void>;
  busy?: boolean;
}) {
  const [value, setValue] = useState(initialName);

  useEffect(() => {
    setValue(initialName);
  }, [initialName]);

  const title = variant === "create" ? "New folder" : "Rename folder";
  const primaryLabel = variant === "create" ? "Create folder" : "Save";

  const submit = async () => {
    const trimmed = value.trim().slice(0, THREAD_FOLDER_NAME_MAX_CHARS);
    if (!trimmed) return;
    await onConfirm(trimmed);
  };

  return (
    <div className="flex w-80 flex-col overflow-hidden rounded-lg border border-border bg-background text-foreground shadow-xl">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <FolderInput
          className="h-4 w-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
        <span className="flex-1 text-sm font-semibold">{title}</span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-3 p-3">
        <input
          type="text"
          autoFocus
          placeholder="Folder name"
          value={value}
          disabled={busy}
          maxLength={THREAD_FOLDER_NAME_MAX_CHARS}
          onChange={(e) =>
            setValue(e.target.value.slice(0, THREAD_FOLDER_NAME_MAX_CHARS))
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") void submit();
          }}
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring"
        />
        <p className="text-right text-[11px] tabular-nums text-muted-foreground">
          {value.length}/{THREAD_FOLDER_NAME_MAX_CHARS}
        </p>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={busy || !value.trim()}
            onClick={() => void submit()}
          >
            {busy ? "…" : primaryLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
