-- Fato detalhe · grain id_chamado · fonte int_chamados_enriched (inclui secretaria Outros)
-- Não alimenta cards do dashboard sem filtros.
-- API: GET /chamados, export XLSX; dashboard com filtros (SQL em mart_chamados + PIC_SCOPE).
-- UI: página Chamados (frontend/app/chamados), não dashboard-view.tsx.

select
    id_chamado,
    data_inicio,
    data_fim,
    prazo_atendimento,
    tipo,
    subtipo,
    status,
    situacao,
    longitude,
    latitude,
    data_particao,
    secretaria,
    dias_resolucao,
    resolvido_no_prazo,
    subprefeitura,
    regiao_administrativa,
    area_planejamento,
    categoria,
    tipo_situacao,
    reclamacoes,
    nome_unidade_organizacional,
    ap_sms
from {{ ref('int_chamados_enriched') }}
