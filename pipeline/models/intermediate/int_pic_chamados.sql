-- filtara secretarias (SMS, SME, SMAS)
select *
from {{ ref('int_chamados_enriched') }}
where {{ pic_secretarias_in_clause() }}
