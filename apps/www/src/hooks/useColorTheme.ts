"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { ColorTheme, colorThemes } from "@/lib/types/theme";

const THEME_STORAGE_KEY = "color-theme";

export function useColorTheme() {
  const { resolvedTheme } = useTheme();
  const [colorTheme, setColorTheme] = useState<ColorTheme>(colorThemes[0]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved) {
      const found = colorThemes.find((t) => t.name === saved);
      if (found) setColorTheme(found);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    const isDark = resolvedTheme === "dark";
    const colors = isDark ? colorTheme.dark : colorTheme.light;
    
    // Update CSS variables
    const root = document.documentElement;
    root.style.setProperty("--primary", colors.primary);
    root.style.setProperty("--primary-foreground", colors.secondary);
    root.style.setProperty("--secondary", colors.secondary);
    root.style.setProperty("--secondary-foreground", colors.primary);
    root.style.setProperty("--background", colors.background);
    root.style.setProperty("--foreground", colors.foreground);
    root.style.setProperty("--card", colors.background);
    root.style.setProperty("--card-foreground", colors.foreground);
    root.style.setProperty("--popover", colors.background);
    root.style.setProperty("--popover-foreground", colors.foreground);
    root.style.setProperty("--border", `${colors.foreground} / 0.1`);
    root.style.setProperty("--input", `${colors.foreground} / 0.1`);
    root.style.setProperty("--ring", `${colors.primary} / 0.35`);
    root.style.setProperty("--muted", colors.secondary);
    root.style.setProperty("--muted-foreground", colors.foreground);
    root.style.setProperty("--accent", colors.secondary);
    root.style.setProperty("--accent-foreground", colors.foreground);
    
    // Add data attribute for Black & White theme
    if (colorTheme.name === "Black & White") {
      root.setAttribute("data-color-theme", "black-white");
    } else {
      root.removeAttribute("data-color-theme");
    }
  }, [colorTheme, resolvedTheme, mounted]);

  const setTheme = (theme: ColorTheme) => {
    setColorTheme(theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme.name);
  };

  return {
    colorTheme,
    setColorTheme: setTheme,
    colorThemes,
    mounted,
  };
}

