"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useColorTheme } from "@/hooks/useColorTheme";
import { OPEN_AV_SETTINGS_EVENT } from "@/hooks/useMediaPermissions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeAvatarImage } from "@/components/ui/theme-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { LogOut, ImageIcon, Headphones } from "lucide-react";
import { signOut } from "@/lib/supabase/auth";
import { useRouter } from "next/navigation";
import { ChangeAvatarDialog } from "./change-avatar-dialog";
import { ThemeEditor } from "./theme-editor";
import { AudioVideoSettingsDialog } from "./audio-video-settings-dialog";

export function UserAvatarMenu() {
  const { user } = useAuth();
  const { colorTheme } = useColorTheme();
  const isBlackWhite = colorTheme.name === "Black & White";
  const router = useRouter();
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [avSettingsOpen, setAvSettingsOpen] = useState(false);

  // Other parts of the app (e.g. a call attempt that found the OS mic/camera
  // permission revoked) can ask us to surface this dialog by dispatching
  // `truechats:open-av-settings`. The dialog's own banner then explains what
  // to fix and links to System Settings.
  useEffect(() => {
    const onOpenRequest = () => setAvSettingsOpen(true);
    window.addEventListener(OPEN_AV_SETTINGS_EVENT, onOpenRequest);
    return () => window.removeEventListener(OPEN_AV_SETTINGS_EVENT, onOpenRequest);
  }, []);

  const handleLogout = async () => {
    await signOut();
    router.push("/auth/login");
  };

  const handleChangeAvatar = () => {
    setAvatarDialogOpen(true);
  };

  const handleAvatarChanged = () => {
    // Refresh the page to show the new avatar
    window.location.reload();
  };

  if (!user) return null;

  const displayName = user.user_metadata?.fullname || user.user_metadata?.username || user.email || "User";
  
  // Get initials for fallback
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      <ChangeAvatarDialog 
        open={avatarDialogOpen} 
        onOpenChange={setAvatarDialogOpen}
        onAvatarChanged={handleAvatarChanged}
      />

      <AudioVideoSettingsDialog
        open={avSettingsOpen}
        onOpenChange={setAvSettingsOpen}
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full p-0 shadow-[0_0_8px_rgba(255,255,255,0.25)] transition-shadow duration-200 hover:shadow-[0_0_12px_rgba(255,255,255,0.45)]"
          >
            <Avatar className="h-9 w-9">
              <ThemeAvatarImage avatarUrl={user.user_metadata?.avatar_url} alt={displayName} />
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{displayName}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleChangeAvatar} className="cursor-pointer">
            <ImageIcon className="mr-2 h-4 w-4" />
            <span>Change Avatar</span>
          </DropdownMenuItem>
          <ThemeEditor />
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setAvSettingsOpen(true)}
            className="cursor-pointer"
          >
            <Headphones className="mr-2 h-4 w-4" />
            <span>Audio/Video Settings</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className={`cursor-pointer ${isBlackWhite ? "text-foreground" : "text-red-600"}`}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log Out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

