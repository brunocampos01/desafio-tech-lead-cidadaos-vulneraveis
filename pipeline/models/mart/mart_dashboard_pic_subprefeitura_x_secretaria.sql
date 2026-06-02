-- Grain subprefeitura × secretaria · fonte int_pic_chamados
-- Card (dashboard-allocation-section.tsx): Total de chamados por secretaria em cada subprefeitura — barras empilhadas

select
    subprefeitura,
    secretaria,
    count(*) as total_chamados
from {{ ref('int_pic_chamados') }}
where subprefeitura is not null
group by 1, 2
order by subprefeitura, total_chamados desc
