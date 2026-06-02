import { ChamadosParams } from "@/lib/api-client";

export const FILTER_PARAM_KEYS: (keyof ChamadosParams)[] = [
  "q",
  "secretaria",
  "tipo",
  "subtipo",
  "status",
  "situacao",
  "data_inicio_from",
  "data_inicio_to",
];

export const PAGINATION_PARAM_KEYS = ["page", "page_size", "sort_by", "sort_order"] as const;

/** Limpa filtros dependentes ao alterar um filtro pai (cascata). */
export function applyCascadeFilter(
  prev: ChamadosParams,
  key: keyof ChamadosParams,
  value: string,
): ChamadosParams {
  const next: ChamadosParams = { ...prev, [key]: value || undefined };
  if (!value) {
    return next;
  }
  if (key === "secretaria") {
    delete next.tipo;
    delete next.subtipo;
  } else if (key === "tipo") {
    delete next.subtipo;
  }
  return next;
}

export function parseChamadosParams(searchParams: URLSearchParams): ChamadosParams {
  const params: ChamadosParams = {};
  for (const key of FILTER_PARAM_KEYS) {
    const v = searchParams.get(key);
    if (v) (params as Record<string, string>)[key] = v;
  }
  const page = searchParams.get("page");
  if (page) params.page = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = searchParams.get("page_size");
  if (pageSize) params.page_size = parseInt(pageSize, 10) || 20;
  const sortBy = searchParams.get("sort_by");
  if (sortBy) params.sort_by = sortBy;
  const sortOrder = searchParams.get("sort_order");
  if (sortOrder === "asc" || sortOrder === "desc") params.sort_order = sortOrder;
  return params;
}

export function buildChamadosSearchParams(
  filters: ChamadosParams,
  options?: { includePagination?: boolean },
): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of FILTER_PARAM_KEYS) {
    const v = filters[key];
    if (v !== undefined && v !== "") params.set(key, String(v));
  }
  if (options?.includePagination) {
    if (filters.page && filters.page > 1) params.set("page", String(filters.page));
    if (filters.page_size && filters.page_size !== 20) params.set("page_size", String(filters.page_size));
    if (filters.sort_by) params.set("sort_by", filters.sort_by);
    if (filters.sort_order) params.set("sort_order", filters.sort_order);
  }
  return params;
}

export function hasActiveChamadosFilters(filters: ChamadosParams): boolean {
  return FILTER_PARAM_KEYS.some((k) => {
    const v = filters[k];
    return v !== undefined && v !== "";
  });
}

export const FILTER_LABELS: Record<string, string> = {
  q: "Busca",
  secretaria: "Secretaria",
  tipo: "Tipo",
  subtipo: "Subtipo",
  status: "Status",
  situacao: "Situação",
  data_inicio_from: "De",
  data_inicio_to: "Até",
};
