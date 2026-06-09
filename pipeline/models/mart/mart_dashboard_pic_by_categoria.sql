-- Grain categoria · fonte int_chamados_enriched
-- Card (dashboard-categoria-card.tsx): Tipo de chamado — volume por categoria (top 10 na UI)

select
    categoria,
    count(*) as total_chamados
from {{ ref('int_chamados_enriched') }}
where categoria is not null
group by 1
order by total_chamados desc
