-- Grain regiao_administrativa × secretaria · fonte int_chamados_enriched
-- Card (dashboard-allocation-section.tsx): Total de chamados por secretaria em cada região administrativa — barras empilhadas

select
    regiao_administrativa as regiao,
    secretaria,
    count(*) as total_chamados
from {{ ref('int_chamados_enriched') }}
where regiao_administrativa is not null
group by 1, 2
order by regiao, total_chamados desc
