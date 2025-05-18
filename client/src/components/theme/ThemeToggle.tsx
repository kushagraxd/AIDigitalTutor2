import React from 'react';
import { Button } from "@/components/ui/button";
import { useTheme } from './ThemeProvider';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      aria-label="Toggle theme"
      className="gap-1 items-center"
    >
      {theme === 'light' ? (
        <>
          <Moon className="h-4 w-4" />
          <span className="ml-1">Dark</span>
        </>
      ) : (
        <>
          <Sun className="h-4 w-4" />
          <span className="ml-1">Light</span>
        </>
      )}
    </Button>
  );
}