const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const REFRESH_BUFFER_SECONDS = 300;

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface PaginatedChamados {
  items: Chamado[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface Chamado {
  id_chamado: string;
  data_inicio?: string;
  data_fim?: string;
  tipo?: string;
  subtipo?: string;
  secretaria?: string;
  status?: string;
  situacao?: string;
  dias_resolucao?: number;
  resolvido_no_prazo?: boolean;
}

export interface FilterOptions {
  tipos: string[];
  subtipos: string[];
  secretarias: string[];
  statuses: string[];
  situacoes: string[];
}

export type UserRole = "operador" | "admin" | "super_admin";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface DataMeta {
  atualizado_em: string | null;
  data_particao_max: string | null;
}

export interface DashboardKpisBlock {
  total_chamados: number;
  total_resolvidos: number;
  taxa_resolucao_prazo: number;
  tempo_medio_resolucao_dias: number | null;
  atualizado_em?: string | null;
  chamados_abertos?: number;
}

export interface DashboardData {
  kpis: DashboardKpisBlock;
  backlog: {
    chamados_abertos: number;
    idade_media_aberto_dias: number | null;
  };
  temporal: Array<{
    periodo: string;
    total_chamados: number;
    total_encerrados: number;
  }>;
  sla_breakdown: {
    no_prazo: number;
    fora_prazo: number;
    fechado_sem_prazo: number;
    em_aberto: number;
  };
  by_secretaria: Array<{
    secretaria: string;
    total_chamados: number;
    taxa_resolucao_prazo: number | null;
  }>;
  top_tipos: Array<{ tipo: string; secretaria: string; total_chamados: number }>;
  by_regiao_atrasos?: Array<{
    territorio: string;
    total_chamados: number;
    taxa_resolucao_prazo: number | null;
  }>;
  by_subprefeitura?: Array<{
    territorio: string;
    total_chamados: number;
    taxa_resolucao_prazo: number | null;
  }>;
  regiao_x_secretaria_vol?: Array<{
    regiao: string;
    secretaria: string;
    total_chamados: number;
  }>;
  subprefeitura_x_secretaria?: Array<{
    subprefeitura: string;
    secretaria: string;
    total_chamados: number;
  }>;
  atrasos_subpref_por_secretaria?: Array<{
    subprefeitura: string;
    secretaria: string;
    chamados_atrasados: number;
    taxa_resolucao_prazo: number | null;
  }>;
  atrasos_subpref_orgao?: Array<{
    secretaria: string;
    subprefeitura: string;
    orgao: string;
    chamados_atrasados: number;
    pct_do_atraso: number;
  }>;
  atrasos_regiao_por_secretaria?: Array<{
    regiao: string;
    secretaria: string;
    chamados_atrasados: number;
    taxa_resolucao_prazo: number | null;
  }>;
  atrasos_regiao_orgao?: Array<{
    secretaria: string;
    regiao: string;
    orgao: string;
    chamados_atrasados: number;
    pct_do_atraso: number;
  }>;
  by_categoria?: Array<{
    categoria: string;
    total_chamados: number;
  }>;
  pressao_reclamacoes?: Array<{
    territorio: string;
    com_reclamacoes_repetidas: number;
  }>;
  pressao_reclamacoes_subpref?: Array<{
    territorio: string;
    com_reclamacoes_repetidas: number;
  }>;
}

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("refresh_token");
}

function decodeJwtExp(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1])) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

function isAccessTokenExpiringSoon(token: string, bufferSeconds = REFRESH_BUFFER_SECONDS): boolean {
  const exp = decodeJwtExp(token);
  if (!exp) return true;
  return exp * 1000 <= Date.now() + bufferSeconds * 1000;
}

let refreshPromise: Promise<TokenPair | null> | null = null;

async function refreshAccessToken(): Promise<TokenPair | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const resp = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!resp.ok) return null;
      const tokens = (await resp.json()) as TokenPair;
      saveTokens(tokens);
      return tokens;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function resolveAccessToken(): Promise<string | null> {
  const accessToken = getAccessToken();
  if (accessToken && !isAccessTokenExpiringSoon(accessToken)) {
    return accessToken;
  }
  const refreshed = await refreshAccessToken();
  return refreshed?.access_token ?? accessToken;
}

function isAuthPath(path: string): boolean {
  return path.startsWith("/auth/");
}

async function fetchWithAuth(path: string, options: RequestInit = {}, retried = false): Promise<Response> {
  const token = await resolveAccessToken();
  const headers: HeadersInit = { ...(options.headers || {}) };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }
  if (!(options.body instanceof FormData)) {
    (headers as Record<string, string>)["Content-Type"] = "application/json";
  }

  const resp = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (resp.status === 401 && !retried && !isAuthPath(path)) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return fetchWithAuth(path, options, true);
    }
    clearTokens();
  }

  return resp;
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const resp = await fetchWithAuth(path, options);

  if (resp.status === 401) {
    throw new Error("Não autorizado");
  }
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(text || resp.statusText);
  }
  if (resp.status === 204) return undefined as T;
  return resp.json();
}

export async function login(email: string, password: string): Promise<TokenPair> {
  const resp = await fetch(`${API_URL}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!resp.ok) throw new Error("Credenciais inválidas");
  return resp.json() as Promise<TokenPair>;
}

export async function getMe(): Promise<UserProfile> {
  return apiFetch<UserProfile>("/auth/me");
}

export interface RbacUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export async function listUsers(): Promise<RbacUser[]> {
  const data = await apiFetch<{ items: RbacUser[] }>("/api/v1/users");
  return data.items;
}

export async function grantUserRole(userId: string, role: UserRole): Promise<void> {
  await apiFetch(`/api/v1/users/${userId}/roles`, {
    method: "POST",
    body: JSON.stringify({ role }),
  });
}

export async function revokeUserRole(userId: string): Promise<void> {
  await apiFetch(`/api/v1/users/${userId}/roles`, { method: "DELETE" });
}

export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();
  if (refreshToken) {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    } catch {
      // Best-effort server-side revocation
    }
  }
  clearTokens();
}

export async function ensureSession(): Promise<boolean> {
  if (!getAccessToken() && !getRefreshToken()) return false;
  const token = await resolveAccessToken();
  return !!token;
}

export async function getDashboard(params: ChamadosParams = {}): Promise<DashboardData> {
  return apiFetch<DashboardData>(`/api/v1/dashboard${toQuery(params as Record<string, string | number | undefined>)}`);
}

export async function getDataMeta(): Promise<DataMeta> {
  return apiFetch<DataMeta>("/api/v1/meta/data");
}

export interface ChamadosParams {
  page?: number;
  page_size?: number;
  q?: string;
  tipo?: string;
  subtipo?: string;
  secretaria?: string;
  status?: string;
  situacao?: string;
  data_inicio_from?: string;
  data_inicio_to?: string;
  sort_by?: string;
  sort_order?: string;
}

function toQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") search.set(k, String(v));
  });
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export async function getChamados(params: ChamadosParams): Promise<PaginatedChamados> {
  return apiFetch<PaginatedChamados>(`/api/v1/chamados${toQuery(params as Record<string, string | number | undefined>)}`);
}

export async function getChamadosFilters(params: ChamadosParams): Promise<FilterOptions> {
  return apiFetch<FilterOptions>(`/api/v1/chamados/filters${toQuery(params as Record<string, string | number | undefined>)}`);
}

export async function exportChamados(params: ChamadosParams): Promise<Blob> {
  const qs = toQuery(params as Record<string, string | number | undefined>);
  const resp = await fetchWithAuth(`/api/v1/export${qs}`);
  if (!resp.ok) throw new Error("Falha na exportação");
  return resp.blob();
}

export function saveTokens(tokens: TokenPair): void {
  localStorage.setItem("access_token", tokens.access_token);
  localStorage.setItem("refresh_token", tokens.refresh_token);
}

export function clearTokens(): void {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

export function isAuthenticated(): boolean {
  return !!(getAccessToken() || getRefreshToken());
}
