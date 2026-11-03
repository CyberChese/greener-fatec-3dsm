\if :{?services} \else \set services 10 \endif
\if :{?days}     \else \set days 30     \endif

BEGIN;
TRUNCATE metric_collections, services;

INSERT INTO services ("external_id", "nameServices", "endpoint", "status", "country", "region_code")
SELECT
  'svc-' || g,
  'Serviço ' || g,
  '/services/svc-' || g || '/metrics',
  (CASE WHEN g % 10 = 0 THEN 'UNAVAILABLE' WHEN g % 7 = 0 THEN 'NO_METRICS' ELSE 'ACTIVE' END)::service_status,
  (ARRAY['Brazil', 'United States', 'Germany'])[1 + g % 3],
  (ARRAY['BR', 'US-CAL-CISO', 'DE'])[1 + g % 3]
FROM generate_series(1, :services) AS g;

INSERT INTO metric_collections (
  service_id, cpu_usage, memory_usage, storage_usage, network_io,
  energy_kwh, carbon_intensity_gco2e_per_kwh, co2e_g, carbon_intensity_fallback, "timestamp"
)
SELECT
  s."idServices",
  round((random() * 100)::numeric, 6),
  round((random() * 8)::numeric, 6),
  round((random() * 200)::numeric, 6),
  round((random() * 5)::numeric, 6),
  e.kwh,
  ci.intensity,
  round(e.kwh * ci.intensity, 8),
  false,
  t.ts + make_interval(secs => (s.ord * 0.05) + random() * 0.04)
FROM generate_series(
       now() - make_interval(days => :days),
       now(),
       interval '30 seconds'
     ) AS t(ts)
CROSS JOIN (SELECT *, row_number() OVER (ORDER BY external_id) AS ord FROM services) s
CROSS JOIN LATERAL (SELECT round((random() * 0.0005)::numeric, 8) AS kwh) e
CROSS JOIN LATERAL (SELECT (ARRAY[90, 250, 380])[1 + abs(hashtext(s.external_id)) % 3]::numeric AS intensity) ci
ORDER BY t.ts, s.ord;
COMMIT;

VACUUM (ANALYZE) services;
VACUUM (ANALYZE) metric_collections;

SELECT
  (SELECT count(*) FROM services)            AS services,
  (SELECT count(*) FROM metric_collections)  AS metric_collections,
  pg_size_pretty(pg_table_size('metric_collections'))           AS heap_size,
  pg_size_pretty(pg_indexes_size('metric_collections'))         AS indexes_size;
