"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ChamadosParams } from "@/lib/api-client";
import {
  applyCascadeFilter,
  buildChamadosSearchParams,
  hasActiveChamadosFilters,
  parseChamadosParams,
} from "@/lib/chamados-filter-utils";

const SEARCH_DEBOUNCE_MS = 400;

export interface UseChamadosUrlStateOptions {
  includePagination?: boolean;
  defaultSort?: { sort_by: string; sort_order: "asc" | "desc" };
}

export function useChamadosUrlState(options: UseChamadosUrlStateOptions = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo(() => parseChamadosParams(searchParams), [searchParams]);

  const [searchDraft, setSearchDraft] = useState(() => searchParams.get("q") ?? "");

  useEffect(() => {
    setSearchDraft(searchParams.get("q") ?? "");
  }, [searchParams]);

  const replaceUrl = useCallback(
    (next: ChamadosParams) => {
      const params = buildChamadosSearchParams(next, {
        includePagination: options.includePagination,
      });
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, options.includePagination],
  );

  useEffect(() => {
    const q = searchDraft.trim() || undefined;
    const currentQ = filters.q;
    if (q === currentQ || (q === undefined && !currentQ)) return;

    const timer = setTimeout(() => {
      const next: ChamadosParams = { ...filters, q };
      if (options.includePagination) next.page = 1;
      replaceUrl(next);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchDraft, filters, replaceUrl, options.includePagination]);

  const updateFilter = useCallback(
    (key: keyof ChamadosParams, value: string) => {
      const next = applyCascadeFilter(filters, key, value);
      if (options.includePagination) next.page = 1;
      replaceUrl(next);
    },
    [filters, replaceUrl, options.includePagination],
  );

  const setPagination = useCallback(
    (patch: Partial<Pick<ChamadosParams, "page" | "page_size" | "sort_by" | "sort_order">>) => {
      replaceUrl({ ...filters, ...patch });
    },
    [filters, replaceUrl],
  );

  const clearFilters = useCallback(() => {
    const next: ChamadosParams = options.includePagination
      ? {
          page: 1,
          page_size: filters.page_size ?? 20,
          sort_by: filters.sort_by ?? options.defaultSort?.sort_by,
          sort_order: filters.sort_order ?? options.defaultSort?.sort_order,
        }
      : {};
    setSearchDraft("");
    replaceUrl(next);
  }, [replaceUrl, options.includePagination, options.defaultSort, filters]);

  const removeFilter = useCallback(
    (key: keyof ChamadosParams) => {
      if (key === "q") {
        setSearchDraft("");
        const next = { ...filters };
        delete next.q;
        replaceUrl(next);
        return;
      }
      updateFilter(key, "");
    },
    [filters, replaceUrl, updateFilter],
  );

  const hasActiveFilters = hasActiveChamadosFilters(filters);

  const filterQueryParams = useMemo(() => {
    const { page: _p, page_size: _ps, sort_by: _sb, sort_order: _so, ...rest } = filters;
    return rest;
  }, [filters]);

  return {
    filters,
    filterQueryParams,
    searchDraft,
    setSearchDraft,
    updateFilter,
    setPagination,
    clearFilters,
    removeFilter,
    hasActiveFilters,
  };
}
