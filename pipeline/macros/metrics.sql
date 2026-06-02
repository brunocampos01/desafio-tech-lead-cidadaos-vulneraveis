{# Condições de negócio reutilizadas — nomes explícitos em vez de repetir SQL nos marts. #}

{% macro encerrado_com_sla() %}
data_fim is not null and prazo_atendimento is not null
{% endmacro %}

{% macro chamado_atrasado() %}
{{ encerrado_com_sla() }} and not resolvido_no_prazo
{% endmacro %}

{% macro agg_taxa_resolucao_prazo_pct() %}
round(
    100.0 * count(*) filter (where resolvido_no_prazo)
    / nullif(count(*) filter (where {{ encerrado_com_sla() }}), 0),
    2
)
{% endmacro %}

{% macro agg_chamados_atrasados() %}
count(*) filter (where {{ chamado_atrasado() }})
{% endmacro %}

{% macro agg_tempo_medio_resolucao_dias() %}
round(avg(dias_resolucao) filter (where dias_resolucao is not null), 2)
{% endmacro %}
