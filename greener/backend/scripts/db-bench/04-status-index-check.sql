\pset pager off
BEGIN;
CREATE INDEX "idx_services_status_candidate" ON "services" ("status");
ANALYZE services;

\echo '=== Volume atual ==='
SELECT count(*) AS services, pg_size_pretty(pg_table_size('services')) AS heap FROM services;

\echo '--- collectCycle: status IN (todos os valores do enum)'
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM services WHERE status IN ('ACTIVE', 'UNAVAILABLE', 'NO_METRICS');
\echo '--- resumo: contagem por status'
EXPLAIN (ANALYZE, BUFFERS) SELECT status, count(*) FROM services GROUP BY status;
\echo '--- filtro seletivo: status = UNAVAILABLE'
EXPLAIN (ANALYZE, BUFFERS) SELECT count(*) FROM services WHERE status = 'UNAVAILABLE';

\echo '=== Volume 100x (só para referência — não é o cenário do projeto) ==='
INSERT INTO services ("external_id", "nameServices", "status")
SELECT 'bulk-' || g, 'Bulk ' || g,
       (CASE WHEN g % 10 = 0 THEN 'UNAVAILABLE' WHEN g % 7 = 0 THEN 'NO_METRICS' ELSE 'ACTIVE' END)::service_status
FROM generate_series(1, 100 * (SELECT count(*) FROM services)) AS g;
ANALYZE services;
SELECT count(*) AS services, pg_size_pretty(pg_table_size('services')) AS heap FROM services;

\echo '--- resumo: contagem por status'
EXPLAIN (ANALYZE, BUFFERS) SELECT status, count(*) FROM services GROUP BY status;
\echo '--- filtro seletivo: status = UNAVAILABLE'
EXPLAIN (ANALYZE, BUFFERS) SELECT count(*) FROM services WHERE status = 'UNAVAILABLE';

ROLLBACK;
