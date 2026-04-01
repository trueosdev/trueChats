"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import type { AttachmentData } from "@/lib/services/attachments";
import { Loader2, Search } from "lucide-react";

interface KlipyFormat {
  url?: string;
}

interface KlipySizeBucket {
  gif?: KlipyFormat;
  webp?: KlipyFormat;
  jpg?: KlipyFormat;
}

interface KlipyFile {
  hd?: KlipySizeBucket;
  md?: KlipySizeBucket;
  sm?: KlipySizeBucket;
}

interface KlipyGifItem {
  id: number | string;
  title?: string;
  content_description?: string;
  file?: KlipyFile;
}

interface KlipyApiResponse {
  results?: KlipyGifItem[];
  error?: string;
}

function getSendGifUrl(file: KlipyFile | undefined): string | null {
  if (!file) return null;
  for (const size of ["hd", "md", "sm"] as const) {
    const u = file[size]?.gif?.url;
    if (u) return u;
  }
  return null;
}

function getPreviewUrl(file: KlipyFile | undefined): string | null {
  if (!file) return null;
  for (const size of ["sm", "md", "hd"] as const) {
    const bucket = file[size];
    const u = bucket?.webp?.url ?? bucket?.gif?.url ?? bucket?.jpg?.url;
    if (u) return u;
  }
  return null;
}

interface KlipyGifPickerProps {
  onGifSelect: (attachment: AttachmentData) => void;
  disabled?: boolean;
}

export function KlipyGifPicker({ onGifSelect, disabled }: KlipyGifPickerProps) {
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<KlipyGifItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const fetchGifs = useCallback(async () => {
    if (!session?.access_token) {
      setError("Sign in to search GIFs");
      setResults([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (debouncedQuery.trim()) params.set("q", debouncedQuery.trim());
      const res = await fetch(`/api/klipy?${params}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = (await res.json()) as KlipyApiResponse;
      if (!res.ok) {
        setError(data.error || "Could not load GIFs");
        setResults([]);
        return;
      }
      setResults(data.results ?? []);
    } catch {
      setError("Could not load GIFs");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, debouncedQuery]);

  useEffect(() => {
    if (!open) return;
    void fetchGifs();
  }, [open, fetchGifs]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setQuery("");
      setDebouncedQuery("");
      setError(null);
    }
  };

  const handlePick = (item: KlipyGifItem) => {
    const url = getSendGifUrl(item.file);
    if (!url) return;
    const attachment: AttachmentData = {
      url,
      type: "image/gif",
      name: item.title || item.content_description || "GIF",
      size: 0,
    };
    onGifSelect(attachment);
    handleOpenChange(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon" }),
            "h-9 w-9 shrink-0",
          )}
          aria-label="GIFs from Klipy"
        >
          <span className="text-[10px] font-bold leading-none tracking-tight text-muted-foreground">
            GIF
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[320px] border-black/10 p-3 dark:border-white/10"
      >
        <div className="flex flex-col gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search Klipy"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-lg border border-black/10 bg-background py-2 pl-8 pr-3 text-sm outline-none focus:ring-1 focus:ring-ring dark:border-white/10"
            />
          </div>
          <ScrollArea className="h-[280px] pr-1">
            {loading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {error}
              </p>
            ) : results.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No GIFs found
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {results.map((item) => {
                  const preview = getPreviewUrl(item.file);
                  if (!preview) return null;
                  return (
                    <button
                      key={String(item.id)}
                      type="button"
                      onClick={() => handlePick(item)}
                      className="group relative aspect-video overflow-hidden rounded-lg bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <img
                        src={preview}
                        alt=""
                        className="h-full w-full object-cover transition group-hover:opacity-90"
                        loading="lazy"
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
          <a
            href="https://klipy.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex shrink-0 justify-center pt-1"
          >
            <img
              src="/klipy-powered-by.svg"
              alt="Powered by Klipy"
              className="h-4 w-auto max-w-full object-contain opacity-95 transition-opacity hover:opacity-100"
            />
          </a>
        </div>
      </PopoverContent>
    </Popover>
  );
}
