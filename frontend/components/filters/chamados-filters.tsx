"use client";

import { useQuery } from "@tanstack/react-query";

import { FilterCombobox } from "@/components/ui/filter-combobox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ChamadosParams, getChamadosFilters } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface ChamadosFiltersProps {
  filters: ChamadosParams;
  onFilterChange: (key: keyof ChamadosParams, value: string) => void;
}

export function ChamadosFilters({ filters, onFilterChange }: ChamadosFiltersProps) {
  const { page: _p, page_size: _ps, sort_by: _sb, sort_order: _so, ...filterParams } = filters;

  const { data: filterOptions, isFetching } = useQuery({
    queryKey: ["chamados-filters", filterParams],
    queryFn: () => getChamadosFilters(filterParams),
  });

  const loading = isFetching;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Filtros
          {loading ? (
            <span className="text-xs font-normal text-muted-foreground">atualizando opções...</span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        <FilterSelect
          label="Secretaria"
          value={filters.secretaria}
          options={filterOptions?.secretarias || []}
          onChange={(v) => onFilterChange("secretaria", v)}
          loading={loading}
        />
        <FilterCombobox
          label="Tipo"
          value={filters.tipo}
          options={filterOptions?.tipos || []}
          onChange={(v) => onFilterChange("tipo", v)}
          loading={loading}
        />
        <FilterCombobox
          label="Subtipo"
          value={filters.subtipo}
          options={filterOptions?.subtipos || []}
          onChange={(v) => onFilterChange("subtipo", v)}
          loading={loading}
        />
        <FilterSelect
          label="Status"
          value={filters.status}
          options={filterOptions?.statuses || []}
          onChange={(v) => onFilterChange("status", v)}
          loading={loading}
        />
        <FilterSelect
          label="Situação"
          value={filters.situacao}
          options={filterOptions?.situacoes || []}
          onChange={(v) => onFilterChange("situacao", v)}
          loading={loading}
        />
      </CardContent>
    </Card>
  );
}

type FilterChangeHandler = (key: keyof ChamadosParams, value: string) => void;

/** Intervalo de data início — usar ao lado da busca (chamados) ou acima dos filtros (dashboard). */
export function ChamadosDateRangeFilters({
  filters,
  onFilterChange,
  className,
}: {
  filters: ChamadosParams;
  onFilterChange: FilterChangeHandler;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-4", className)}>
      <FilterDate
        label="Data início (de)"
        value={filters.data_inicio_from}
        onChange={(v) => onFilterChange("data_inicio_from", v)}
      />
      <FilterDate
        label="Data início (até)"
        value={filters.data_inicio_to}
        onChange={(v) => onFilterChange("data_inicio_to", v)}
      />
    </div>
  );
}

function FilterDate({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex min-w-[10.5rem] flex-col gap-1 text-xs text-muted-foreground">
      {label}
      <Input type="date" value={value || ""} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
  loading,
}: {
  label: string;
  value?: string;
  options: string[];
  onChange: (value: string) => void;
  loading?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      {label}
      <select
        className={cn(
          "h-10 rounded-md border border-border bg-card px-2 text-sm text-foreground",
          loading && "opacity-70",
        )}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading}
      >
        <option value="">Todos</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}
