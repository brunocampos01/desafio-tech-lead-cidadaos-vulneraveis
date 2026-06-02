-- Grain periodo (mês) · fonte int_pic_chamados
-- Card (dashboard-view.tsx): Evolução intersetorial — linhas Demandas / Encerrados

select
    date_trunc('month', cast(data_inicio as date)) as periodo,
    count(*) as total_chamados,
    count(*) filter (where data_fim is not null) as total_encerrados
from {{ ref('int_pic_chamados') }}
where data_inicio is not null
group by 1
order by 1
