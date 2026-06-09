-- Grain secretaria (SMS, SME, SMAS) · fonte int_chamados_enriched
-- Card (dashboard-view.tsx): Por secretaria intersetorial — barras de volume

select
    secretaria,
    count(*) as total_chamados,
    {{ agg_taxa_resolucao_prazo_pct() }} as taxa_resolucao_prazo
from {{ ref('int_chamados_enriched') }}
group by 1
order by total_chamados desc
