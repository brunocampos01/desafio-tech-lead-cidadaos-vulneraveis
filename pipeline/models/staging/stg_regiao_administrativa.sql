select
    cast(id_regiao_administrativa as varchar) as id_regiao_administrativa,
    cast(nome as varchar) as nome,
    cast(id_area_planejamento_sms as varchar) as ap_sms
from read_parquet('../data/raw/regiao_administrativa.parquet')
