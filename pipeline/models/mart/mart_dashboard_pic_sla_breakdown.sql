-- Grain global (1 linha) · fonte int_chamados_enriched
-- Card (dashboard-view.tsx): Composição SLA (Acordo de Nível de Serviço) — gráfico donut

select
    count(*) filter (where {{ encerrado_com_sla() }} and resolvido_no_prazo) as no_prazo,
    count(*) filter (where {{ chamado_atrasado() }}) as fora_prazo,
    count(*) filter (where data_fim is not null and prazo_atendimento is null) as fechado_sem_prazo,
    count(*) filter (where data_fim is null) as em_aberto
from {{ ref('int_chamados_enriched') }}
