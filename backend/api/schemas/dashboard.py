from __future__ import annotations

from pydantic import BaseModel


class DashboardKpis(BaseModel):
    total_chamados: int
    total_resolvidos: int
    taxa_resolucao_prazo: float
    tempo_medio_resolucao_dias: float | None
    atualizado_em: str | None = None
    chamados_abertos: int = 0


class BacklogKpis(BaseModel):
    chamados_abertos: int
    idade_media_aberto_dias: float | None


class TemporalPoint(BaseModel):
    periodo: str
    total_chamados: int
    total_encerrados: int


class SecretariaKpi(BaseModel):
    secretaria: str
    total_chamados: int
    taxa_resolucao_prazo: float | None


class TipoVolume(BaseModel):
    tipo: str
    secretaria: str
    total_chamados: int


class SlaBreakdown(BaseModel):
    no_prazo: int
    fora_prazo: int
    fechado_sem_prazo: int
    em_aberto: int


class TerritorialVolume(BaseModel):
    territorio: str
    total_chamados: int
    taxa_resolucao_prazo: float | None = None


class RegiaoSecretariaCell(BaseModel):
    regiao: str
    secretaria: str
    total_chamados: int | None = None
    chamados_atrasados: int | None = None
    taxa_resolucao_prazo: float | None = None


class SubprefeituraSecretariaCell(BaseModel):
    subprefeitura: str
    secretaria: str
    total_chamados: int | None = None
    chamados_atrasados: int | None = None
    taxa_resolucao_prazo: float | None = None


class AtrasoOrgaoShare(BaseModel):
    secretaria: str
    subprefeitura: str
    orgao: str
    chamados_atrasados: int
    pct_do_atraso: float


class AtrasoRegiaoOrgaoShare(BaseModel):
    secretaria: str
    regiao: str
    orgao: str
    chamados_atrasados: int
    pct_do_atraso: float


class CategoriaVolume(BaseModel):
    categoria: str
    total_chamados: int


class ReclamacoesPressure(BaseModel):
    territorio: str
    com_reclamacoes_repetidas: int


class DashboardResponse(BaseModel):
    """Dashboard intersetorial PIC (SMS, SME, SMAS) apenas."""

    kpis: DashboardKpis
    backlog: BacklogKpis
    temporal: list[TemporalPoint]
    sla_breakdown: SlaBreakdown
    by_secretaria: list[SecretariaKpi]
    top_tipos: list[TipoVolume]
    by_regiao_atrasos: list[TerritorialVolume] = []
    by_subprefeitura: list[TerritorialVolume] = []
    regiao_x_secretaria_vol: list[RegiaoSecretariaCell] = []
    subprefeitura_x_secretaria: list[SubprefeituraSecretariaCell] = []
    atrasos_subpref_por_secretaria: list[SubprefeituraSecretariaCell] = []
    atrasos_subpref_orgao: list[AtrasoOrgaoShare] = []
    atrasos_regiao_por_secretaria: list[RegiaoSecretariaCell] = []
    atrasos_regiao_orgao: list[AtrasoRegiaoOrgaoShare] = []
    by_categoria: list[CategoriaVolume] = []
    pressao_reclamacoes: list[ReclamacoesPressure] = []
    pressao_reclamacoes_subpref: list[ReclamacoesPressure] = []
