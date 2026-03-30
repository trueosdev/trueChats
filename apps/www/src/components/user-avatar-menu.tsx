"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useColorTheme } from "@/hooks/useColorTheme";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeAvatarImage } from "@/components/ui/theme-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { LogOut, ImageIcon, SettingsIcon } from "lucide-react";
import { useFrameInset } from "@/components/frame-inset/frame-inset-provider";
import { signOut } from "@/lib/supabase/auth";
import { useRouter } from "next/navigation";
import { ChangeAvatarDialog } from "./change-avatar-dialog";
import { ThemeEditor } from "./theme-editor";

export function UserAvatarMenu() {
  const { user } = useAuth();
  const { colorTheme } = useColorTheme();
  const { openBorderAdjust } = useFrameInset();
  const isBlackWhite = colorTheme.name === "Black & White";
  const router = useRouter();
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);

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
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full p-0">
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
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="cursor-pointer">
              <SettingsIcon className="mr-2 h-4 w-4" />
              <span>More settings...</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={openBorderAdjust}
              >
                Adjust border
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
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

