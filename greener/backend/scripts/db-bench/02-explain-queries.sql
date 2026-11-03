\pset pager off
SELECT service_id AS svc FROM metric_collections GROUP BY service_id ORDER BY count(*) DESC, service_id LIMIT 1 \gset
SELECT (now() - interval '15 minutes')::text AS from_15m,
       (now() - interval '24 hours')::text AS from_24h,
       (now() - interval '7 days')::text   AS from_7d,
       now()::text                         AS to_now \gset

\echo '=== Q1a · histórico de 1 serviço, últimos 15 min (coleta mais recente — LATEST_WINDOW_MS) ==='
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM metric_collections
WHERE service_id = :'svc' AND "timestamp" >= :'from_15m'
ORDER BY "timestamp" ASC;

\echo '=== Q1b · histórico de 1 serviço, últimas 24 h (painel de histórico / resumo derivado) ==='
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM metric_collections
WHERE service_id = :'svc' AND "timestamp" >= :'from_24h'
ORDER BY "timestamp" ASC;

\echo '=== Q1c · histórico de 1 serviço, sem filtro (a API permite; o frontend não usa) ==='
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM metric_collections
WHERE service_id = :'svc'
ORDER BY "timestamp" ASC;

\echo '=== Q2 · última coleta ==='
EXPLAIN (ANALYZE, BUFFERS)
SELECT "timestamp" FROM metric_collections ORDER BY "timestamp" DESC LIMIT 1;

\echo '=== Q3 · serviços a coletar (status IN todos os valores do enum) ==='
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM services WHERE status IN ('ACTIVE', 'UNAVAILABLE', 'NO_METRICS');

\echo '=== Q4 · contagem de serviços por status ==='
EXPLAIN (ANALYZE, BUFFERS)
SELECT status, count(*) FROM services GROUP BY status;

\echo '=== Q4b · só serviços ACTIVE ==='
EXPLAIN (ANALYZE, BUFFERS)
SELECT count(*) FROM services WHERE status = 'ACTIVE';

\echo '=== Q5a · totais de energia/CO2e, últimas 24 h ==='
EXPLAIN (ANALYZE, BUFFERS)
SELECT sum(energy_kwh) AS energy_kwh, sum(co2e_g) / 1000 AS co2e_kg, max("timestamp") AS last_collection_at
FROM metric_collections
WHERE "timestamp" BETWEEN :'from_24h' AND :'to_now';

\echo '=== Q5b · totais de energia/CO2e, últimos 7 dias ==='
EXPLAIN (ANALYZE, BUFFERS)
SELECT sum(energy_kwh) AS energy_kwh, sum(co2e_g) / 1000 AS co2e_kg, max("timestamp") AS last_collection_at
FROM metric_collections
WHERE "timestamp" BETWEEN :'from_7d' AND :'to_now';

\echo '=== Q5c · totais de energia/CO2e, todo o histórico ==='
EXPLAIN (ANALYZE, BUFFERS)
SELECT sum(energy_kwh) AS energy_kwh, sum(co2e_g) / 1000 AS co2e_kg, max("timestamp") AS last_collection_at
FROM metric_collections;

\echo '=== Tamanho dos índices ==='
SELECT indexrelname AS index, pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE relname IN ('metric_collections', 'services')
ORDER BY relname, indexrelname;
