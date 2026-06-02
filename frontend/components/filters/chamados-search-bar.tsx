"use client";

import { ChamadosDateRangeFilters } from "@/components/filters/chamados-filters";
import { Input } from "@/components/ui/input";
import { ChamadosParams } from "@/lib/api-client";

interface ChamadosSearchBarProps {
  filters: ChamadosParams;
  searchDraft: string;
  onSearchChange: (value: string) => void;
  onFilterChange: (key: keyof ChamadosParams, value: string) => void;
}

/** Busca textual + intervalo de data início (compartilhado entre dashboard e chamados). */
export function ChamadosSearchBar({
  filters,
  searchDraft,
  onSearchChange,
  onFilterChange,
}: ChamadosSearchBarProps) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs text-muted-foreground">
        Busca
        <Input
          type="search"
          placeholder="ID, tipo, secretaria, status..."
          value={searchDraft}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </label>
      <ChamadosDateRangeFilters filters={filters} onFilterChange={onFilterChange} />
    </div>
  );
}
