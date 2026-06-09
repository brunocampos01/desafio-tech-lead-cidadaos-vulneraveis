-- Grain global (1 linha) · fonte int_chamados_enriched
-- Cards (dashboard-view.tsx): Demandas em aberto, Idade média (abertas)

select
    count(*) filter (where data_fim is null) as chamados_abertos,
    round(
        avg(date_diff('day', cast(data_inicio as date), current_date))
        filter (where data_fim is null and data_inicio is not null),
        1
    ) as idade_media_aberto_dias
from {{ ref('int_chamados_enriched') }}
