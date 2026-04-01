import { X, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatFileSize } from "@/lib/services/attachments";
import { useColorTheme } from "@/hooks/useColorTheme";

interface FilePreviewProps {
  file: File;
  previewUrl: string | null;
  onRemove: () => void;
  disabled?: boolean;
}

export function FilePreview({ file, previewUrl, onRemove, disabled }: FilePreviewProps) {
  const { colorTheme } = useColorTheme();
  const isBlackWhite = colorTheme.name === "Black & White";
  
  return (
    <div className="absolute bottom-full left-2 right-2 mb-2 bg-white dark:bg-black rounded-xl shadow-xl border border-black/10 dark:border-white/10 overflow-hidden animate-in slide-in-from-bottom-2">
      {previewUrl ? (
        // Image preview
        <div className="relative">
          <div className="relative bg-gradient-to-br from-black/3 to-black/5 dark:from-white/5 dark:to-white/10 p-4">
            <img
              src={previewUrl}
              alt={file.name}
              className="rounded-lg w-full h-auto object-contain shadow-sm"
              style={{ maxHeight: '200px' }}
            />
          </div>
          <div className="p-3 border-t border-black/10 dark:border-white/10 flex items-center justify-between">
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-medium truncate text-foreground">
                {file.name}
              </span>
              <span className="text-xs text-foreground/50">
                {formatFileSize(file.size)}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onRemove}
              className={isBlackWhite 
                ? "h-8 w-8 shrink-0 hover:bg-accent" 
                : "h-8 w-8 shrink-0 hover:bg-red-100 dark:hover:bg-red-900/20"}
              disabled={disabled}
            >
              <X className={isBlackWhite 
                ? "h-4 w-4 text-foreground" 
                : "h-4 w-4 text-red-600 dark:text-red-400"} />
            </Button>
          </div>
        </div>
      ) : (
        // File preview (non-image)
        <div className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-black/70 to-black/80 dark:from-white/10 dark:to-white/15 rounded-lg shadow-sm">
              <Paperclip className="h-5 w-5 text-white dark:text-white/90" />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-medium truncate text-foreground">
                {file.name}
              </span>
              <span className="text-xs text-foreground/50">
                {formatFileSize(file.size)}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className={isBlackWhite 
              ? "h-8 w-8 shrink-0 hover:bg-accent" 
              : "h-8 w-8 shrink-0 hover:bg-red-100 dark:hover:bg-red-900/20"}
            disabled={disabled}
          >
            <X className={isBlackWhite 
              ? "h-4 w-4 text-foreground" 
              : "h-4 w-4 text-red-600 dark:text-red-400"} />
          </Button>
        </div>
      )}
    </div>
  );
}

