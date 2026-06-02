"use client";

import { useQuery } from "@tanstack/react-query";
import { Suspense } from "react";

import { DashboardView } from "@/components/dashboard/dashboard-view";
import { ActiveFilterChips } from "@/components/filters/active-filter-chips";
import { ChamadosFilters } from "@/components/filters/chamados-filters";
import { ChamadosSearchBar } from "@/components/filters/chamados-search-bar";
import { Button } from "@/components/ui/button";
import { useChamadosUrlState } from "@/hooks/use-chamados-url-state";
import { getDashboard } from "@/lib/api-client";

function DashboardContentInner() {
  const {
    filters,
    searchDraft,
    setSearchDraft,
    updateFilter,
    clearFilters,
    removeFilter,
    hasActiveFilters,
  } = useChamadosUrlState();

  const { data, isLoading, error, isFetching, refetch } = useQuery({
    queryKey: ["dashboard", filters],
    queryFn: () => getDashboard(filters),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            Indicadores agregados com filtros em cascata
            {isFetching && !isLoading ? " · atualizando..." : ""}
          </p>
        </div>
        {hasActiveFilters ? (
          <Button variant="outline" onClick={clearFilters}>
            Limpar filtros
          </Button>
        ) : null}
      </div>

      <ChamadosSearchBar
        filters={filters}
        searchDraft={searchDraft}
        onSearchChange={setSearchDraft}
        onFilterChange={updateFilter}
      />

      <ActiveFilterChips filters={filters} onRemove={removeFilter} />

      <ChamadosFilters filters={filters} onFilterChange={updateFilter} />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando indicadores...</p>
      ) : null}
      {error ? (
        <div className="flex flex-wrap items-center gap-3 text-sm text-red-600 dark:text-red-400">
          <span>Erro ao carregar dashboard.</span>
          <Button variant="outline" className="h-8 px-3 text-xs" onClick={() => refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : null}
      {data ? <DashboardView data={data} /> : null}
    </div>
  );
}

export function DashboardContent() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando...</p>}>
      <DashboardContentInner />
    </Suspense>
  );
}
