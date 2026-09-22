'use client';

import { Button } from '@bloomstock/ui';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/theme/theme-provider';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <Button variant="ghost" type="button" onClick={toggle} aria-label="Toggle color theme">
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </Button>
  );
}
