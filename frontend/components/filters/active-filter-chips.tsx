"use client";

import { X } from "lucide-react";

import { ChamadosParams } from "@/lib/api-client";
import { FILTER_LABELS, FILTER_PARAM_KEYS } from "@/lib/chamados-filter-utils";

interface ActiveFilterChipsProps {
  filters: ChamadosParams;
  onRemove: (key: keyof ChamadosParams) => void;
}

export function ActiveFilterChips({ filters, onRemove }: ActiveFilterChipsProps) {
  const chips = FILTER_PARAM_KEYS.filter((key) => {
    const v = filters[key];
    return v !== undefined && v !== "";
  });

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2" role="list" aria-label="Filtros ativos">
      {chips.map((key) => {
        const v = filters[key];
        const label = FILTER_LABELS[key] ?? key;
        return (
          <button
            key={key}
            type="button"
            role="listitem"
            onClick={() => onRemove(key)}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-foreground hover:bg-muted"
          >
            <span className="text-muted-foreground">{label}:</span>
            <span className="max-w-[12rem] truncate font-medium">{String(v)}</span>
            <X className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
