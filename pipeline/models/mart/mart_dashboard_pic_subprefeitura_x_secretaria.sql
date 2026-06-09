-- Grain subprefeitura × secretaria · fonte int_chamados_enriched
-- Card (dashboard-allocation-section.tsx): Total de chamados por secretaria em cada subprefeitura — barras empilhadas

select
    subprefeitura,
    secretaria,
    count(*) as total_chamados
from {{ ref('int_chamados_enriched') }}
where subprefeitura is not null
group by 1, 2
order by subprefeitura, total_chamados desc
