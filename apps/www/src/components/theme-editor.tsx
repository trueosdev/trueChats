"use client";

import { Palette, Moon, Sun, Monitor, Check, Terminal } from "lucide-react";
import { useColorTheme } from "@/hooks/useColorTheme";
import { useTheme } from "next-themes";
import { useTerminal } from "@/hooks/useTerminal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeEditor() {
  const { colorTheme, setColorTheme, colorThemes, mounted } = useColorTheme();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { isTerminalMode, toggleTerminalMode } = useTerminal();

  if (!mounted) return null;

  return (
    <>
      <DropdownMenuLabel>Theme</DropdownMenuLabel>
      <DropdownMenuSeparator />
      
      {/* Light/Dark/System Mode Toggle */}
      <DropdownMenuItem onClick={() => setTheme("light")} className="cursor-pointer">
        <Sun className="mr-2 h-4 w-4" />
        <span>Light</span>
        {theme === "light" && <Check className="ml-auto h-4 w-4" />}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => setTheme("dark")} className="cursor-pointer">
        <Moon className="mr-2 h-4 w-4" />
        <span>Dark</span>
        {theme === "dark" && <Check className="ml-auto h-4 w-4" />}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => setTheme("system")} className="cursor-pointer">
        <Monitor className="mr-2 h-4 w-4" />
        <span>System</span>
        {theme === "system" && <Check className="ml-auto h-4 w-4" />}
      </DropdownMenuItem>
      
      <DropdownMenuSeparator />
      
      {/* Terminal Mode Toggle */}
      <DropdownMenuItem onClick={toggleTerminalMode} className="cursor-pointer">
        <Terminal className="mr-2 h-4 w-4" />
        <span>Terminal Mode</span>
        {isTerminalMode && <Check className="ml-auto h-4 w-4" />}
      </DropdownMenuItem>
      
      <DropdownMenuSeparator />
      
      {/* Color Theme Submenu */}
      <DropdownMenuSub>
        <DropdownMenuSubTrigger className="cursor-pointer">
          <Palette className="mr-2 h-4 w-4" />
          <span>Color Theme</span>
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          {colorThemes.map((theme) => (
            <DropdownMenuItem
              key={theme.name}
              onClick={() => setColorTheme(theme)}
              className="cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full border border-black/10 dark:border-white/10"
                    style={{
                      backgroundColor: `hsl(${
                        resolvedTheme === "dark" ? theme.dark.primary : theme.light.primary
                      })`,
                    }}
                  />
                  <span>{theme.name}</span>
                </div>
                {colorTheme.name === theme.name && (
                  <Check className="h-4 w-4" />
                )}
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    </>
  );
}

