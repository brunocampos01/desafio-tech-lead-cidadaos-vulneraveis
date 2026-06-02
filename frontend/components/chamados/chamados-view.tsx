"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Suspense, useMemo, useState } from "react";

import { ActiveFilterChips } from "@/components/filters/active-filter-chips";
import { ChamadosFilters } from "@/components/filters/chamados-filters";
import { ChamadosSearchBar } from "@/components/filters/chamados-search-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useChamadosUrlState } from "@/hooks/use-chamados-url-state";
import { ChamadosParams, exportChamados, getChamados } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type SortColumn =
  | "data_inicio"
  | "data_fim"
  | "tipo"
  | "secretaria"
  | "status"
  | "resolvido_no_prazo";
type SortOrder = "asc" | "desc";

const SORT_COLUMNS: { key: SortColumn; label: string }[] = [
  { key: "data_inicio", label: "Data início" },
  { key: "data_fim", label: "Data fim" },
  { key: "tipo", label: "Tipo" },
  { key: "secretaria", label: "Secretaria" },
  { key: "status", label: "Status" },
  { key: "resolvido_no_prazo", label: "No prazo" },
];

function ChamadosViewInner() {
  const {
    filters,
    searchDraft,
    setSearchDraft,
    updateFilter,
    setPagination,
    clearFilters,
    removeFilter,
    hasActiveFilters,
  } = useChamadosUrlState({
    includePagination: true,
    defaultSort: { sort_by: "data_inicio", sort_order: "desc" },
  });

  const sortBy = (filters.sort_by as SortColumn) || "data_inicio";
  const sortOrder = (filters.sort_order as SortOrder) || "desc";
  const page = filters.page ?? 1;

  const queryParams = useMemo(
    () => ({
      ...filters,
      page,
      page_size: filters.page_size ?? 20,
      sort_by: sortBy,
      sort_order: sortOrder,
    }),
    [filters, page, sortBy, sortOrder],
  );

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["chamados", queryParams],
    queryFn: () => getChamados(queryParams),
    placeholderData: (prev) => prev,
  });

  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const blob = await exportChamados(queryParams);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "chamados.csv";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  function toggleSort(column: SortColumn) {
    if (sortBy === column) {
      setPagination({ sort_by: column, sort_order: sortOrder === "asc" ? "desc" : "asc", page: 1 });
    } else {
      setPagination({
        sort_by: column,
        sort_order: column === "data_inicio" || column === "data_fim" ? "desc" : "asc",
        page: 1,
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Chamados</h2>
          <p className="text-sm text-muted-foreground">
            Filtros em cascata e exportação
            {isFetching && !isLoading ? " · atualizando..." : ""}
          </p>
        </div>
        <div className="flex gap-2">
          {hasActiveFilters ? (
            <Button variant="outline" onClick={clearFilters}>
              Limpar filtros
            </Button>
          ) : null}
          <Button onClick={handleExport} disabled={exporting}>
            {exporting ? "Exportando..." : "Exportar CSV"}
          </Button>
        </div>
      </div>

      <ChamadosSearchBar
        filters={filters}
        searchDraft={searchDraft}
        onSearchChange={setSearchDraft}
        onFilterChange={updateFilter}
      />

      <ActiveFilterChips filters={filters} onRemove={removeFilter} />

      <ChamadosFilters filters={filters} onFilterChange={updateFilter} />

      <Card>
        <CardContent className="overflow-x-auto p-0">
          {isLoading && !data ? (
            <p className="p-6 text-sm text-muted-foreground">Carregando...</p>
          ) : data?.items.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Nenhum chamado encontrado com estes filtros.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left">
                <tr>
                  <th className="p-3">ID</th>
                  {SORT_COLUMNS.map(({ key, label }) => (
                    <SortableHeader
                      key={key}
                      label={label}
                      active={sortBy === key}
                      order={sortOrder}
                      onClick={() => toggleSort(key)}
                    />
                  ))}
                </tr>
              </thead>
              <tbody>
                {data?.items.map((item) => (
                  <tr key={item.id_chamado} className="border-b">
                    <td className="p-3 font-mono text-xs">{item.id_chamado}</td>
                    <td className="p-3">{formatDate(item.data_inicio)}</td>
                    <td className="p-3">{formatDate(item.data_fim)}</td>
                    <td className="p-3">{item.tipo}</td>
                    <td className="p-3">{item.secretaria}</td>
                    <td className="p-3">{item.status}</td>
                    <td className="p-3">{item.resolvido_no_prazo ? "Sim" : "Não"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Total: {data?.total ?? 0} · Página {data?.page ?? 1} de {data?.pages ?? 1}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPagination({ page: page - 1 })}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            disabled={!data || page >= data.pages}
            onClick={() => setPagination({ page: page + 1 })}
          >
            Próxima
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ChamadosView() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando...</p>}>
      <ChamadosViewInner />
    </Suspense>
  );
}

function formatDate(value?: string): string {
  if (!value) return "—";
  return value.slice(0, 10);
}

function SortableHeader({
  label,
  active,
  order,
  onClick,
}: {
  label: string;
  active: boolean;
  order: SortOrder;
  onClick: () => void;
}) {
  const Icon = active ? (order === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <th className="p-3">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1 font-semibold transition-colors hover:text-primary",
          active && "text-primary",
        )}
        aria-label={`Ordenar por ${label}`}
      >
        {label}
        <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
      </button>
    </th>
  );
}
