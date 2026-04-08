"use client";

import React from "react";
import { useLanguage, Locale, localeNames, localeFlags } from "@/contexts/language-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";

export function LanguageToggle() {
  const { locale, setLocale } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Change language"
          className="h-8 w-8 sm:h-10 sm:w-10 focus-visible:outline-none focus:outline-none focus-visible:ring-0 focus:ring-0"
        >
          <Globe className="h-4 w-4 sm:h-[1.2rem] sm:w-[1.2rem] text-gray-700 dark:text-muted-foreground" />
          <span className="sr-only">Toggle language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        {(Object.keys(localeNames) as Locale[]).map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => setLocale(loc)}
            className={`flex items-center gap-2 cursor-pointer ${
              locale === loc ? "bg-accent font-medium" : ""
            }`}
          >
            <span className="text-base">{localeFlags[loc]}</span>
            <span>{localeNames[loc]}</span>
            {locale === loc && (
              <span className="ml-auto text-xs text-muted-foreground">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
