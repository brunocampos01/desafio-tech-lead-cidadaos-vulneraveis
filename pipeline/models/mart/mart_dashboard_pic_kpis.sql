-- Grain global (1 linha) · fonte int_chamados_enriched
-- Cards (dashboard-view.tsx): Demandas intersetoriais, Encerradas, No prazo (PIC), Tempo médio de resolução

select
    count(*) as total_chamados,
    count(*) filter (where data_fim is not null) as total_resolvidos,
    count(*) filter (where data_fim is null) as chamados_abertos,
    {{ agg_taxa_resolucao_prazo_pct() }} as taxa_resolucao_prazo,
    round(avg(dias_resolucao) filter (where dias_resolucao is not null), 2) as tempo_medio_resolucao_dias,
    current_timestamp as atualizado_em
from {{ ref('int_chamados_enriched') }}
