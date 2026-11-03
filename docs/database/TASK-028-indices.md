# TASK-028 — Otimização de persistência e índices no PostgreSQL

Issue: [#70](https://github.com/CyberChese/greener-fatec-3dsm/issues/70) · Tipo `[DB]` · Módulo ⏱️ Metrics · RF05 · RNF04 · RP03

## Resumo da decisão

| Índice | Antes | Depois | Motivo |
|---|---|---|---|
| `idx_metric_collections_service_timestamp` `(service_id, "timestamp")` | existe | **mantido, sem alteração** | Critério de aceite: não recriar sob outro nome. |
| `idx_metric_collections_service_id` `(service_id)` | existe | **removido** | Prefixo à esquerda do índice composto, que já atende qualquer busca por `service_id` (inclusive a checagem da FK). Mantê-lo só custava escrita. |
| `idx_metric_collections_timestamp` `("timestamp")` | existe | **substituído** por `idx_metric_collections_timestamp_totals` | Mesma chave, agora com `INCLUDE (energy_kwh, co2e_g)`: os totais do resumo passam a sair de um *Index Only Scan*. |
| Índice em `services.status` | não existe | **não criado** | Nenhuma consulta real se beneficia dele (ver seção 4). |

Migration: `greener/backend/src/migrations/1793404800000-OptimizeMetricCollectionIndexes.ts`. Ela é reversível: o `down` recria exatamente os dois índices removidos e apaga o novo.

Sobre o "status de serviços": a coluna `services.status` (enum `service_status`: `ACTIVE`, `UNAVAILABLE`, `NO_METRICS`) já existe desde `CreateInitialSchema1791678624275` e é atualizada pelo `MetricsService`. Por isso esta task não muda a coluna. A única dúvida era se valia criar um índice nela, e as medições abaixo mostram que não vale.

## 1. Consultas analisadas

As consultas são as que o backend executa hoje, mais as do resumo descrito no contrato de `GET /api/metrics/summary` (`frontend/src/services/summary.ts`). Como o endpoint de resumo (TASK-023) ainda não existe, o SQL de Q4/Q5 segue esse contrato. Quando ele for implementado, rode os scripts de novo com o SQL final.

| Id | Origem | SQL (simplificado) |
|---|---|---|
| Q1a | `findHistory`, frontend `LATEST_WINDOW_MS` (15 min) | `WHERE service_id = $1 AND "timestamp" >= $from ORDER BY "timestamp"` |
| Q1b | `findHistory`, painel de histórico / resumo derivado (24 h) | idem, `from` = agora − 24 h |
| Q1c | `findHistory` sem `from`/`to` (a API permite, o frontend não usa) | `WHERE service_id = $1 ORDER BY "timestamp"` |
| Q2 | `getCollectionConfig` (última coleta) | `ORDER BY "timestamp" DESC LIMIT 1` |
| Q3 | `collectCycle` | `services WHERE status IN (todos os valores)` |
| Q4 | resumo: contagem por status | `SELECT status, count(*) FROM services GROUP BY status` |
| Q5a/b/c | resumo: energia e CO2e por período (24 h / 7 d / tudo) | `SELECT sum(energy_kwh), sum(co2e_g)/1000, max("timestamp") ... WHERE "timestamp" >= $from` |

As colunas usadas são as reais: `"timestamp"` (não existe `created_at` em `metric_collections`), `energy_kwh` e `co2e_g`.

## 2. Ambiente e volume de amostra

- PostgreSQL **16.15** (o `compose.yaml` usa 15; o planner tem o mesmo comportamento nesses casos, mas vale repetir no container com os scripts). Configuração padrão (`work_mem` 4 MB, `shared_buffers` 128 MB), 2 vCPU e 7 GB de RAM.
- Schema criado aplicando **as próprias migrations do projeto**, em ordem.
- Massa gerada por `scripts/db-bench/01-seed-sample.sql`: **10 serviços × 30 dias × 1 coleta a cada 30 s = 864.010 linhas** em `metric_collections`, heap de 109 MB. A ordem de inserção imita o coletor (cronológica, serviços intercalados, `new Date()` diferente para cada um).
- Antes das medições foi rodado `VACUUM (ANALYZE)`. O autovacuum faz isso sozinho em tabelas *append-only* desde o PG 13, e é isso que permite `Heap Fetches: 0` no *Index Only Scan*.
- Tempos: mediana de 15 execuções com cache quente (`scripts/db-bench/03-bench-timing.sh`).

## 3. Resultados (antes → depois da migration)

| Consulta | Plano antes | Plano depois | Buffers | Mediana (ms) |
|---|---|---|---|---|
| Q1a histórico 15 min | Index Scan `timestamp` | Index Scan `timestamp_totals` | 10 → 11 | 0,087 → 0,085 |
| Q1b histórico 24 h | Index Scan `timestamp` + Filter | Index Scan `timestamp_totals` + Filter | 548 → 612 | 3,52 → 3,60 |
| Q1c histórico completo | Bitmap `service_id` + Sort | Bitmap `service_timestamp` + Sort | 14.076 → 14.767 | 74,1 → 72,7 |
| Q2 última coleta | Index Only Scan Backward | Index Only Scan Backward | 4 → 4 | 0,05 → 0,06 |
| Q4 contagem por status | Seq Scan | Seq Scan | 1 → 1 | 0,16 → 0,15 |
| **Q5a totais 24 h** | Index Scan | **Index Only Scan** (Heap Fetches 0) | **548 → 146 (−73%)** | 7,2 → 5,7 |
| **Q5b totais 7 dias** | Parallel Index Scan | **Parallel Index Only Scan** (Heap Fetches 0) | **4.211 → 1.000 (−76%)** | 39,2 → 28,4 |
| Q5c totais de todo o histórico | Parallel **Seq Scan** | Parallel **Seq Scan** | 13.998 → 13.998 | 108 → 104 |

**Escrita** (o coletor insere 1 linha por serviço a cada 30 s). Inserir 50.000 linhas numa transação com rollback, mediana de 7 execuções: **951 ms → 787 ms (−17%)**, com 24% menos buffers tocados. A tabela passa de 4 para 3 índices.

**Tamanho em disco** (logo após o seed): `service_id` 5,5 MB (removido) e `timestamp` 19 MB → `timestamp_totals` 33 MB. O total de índices sobe cerca de 8 MB, porque o `INCLUDE` guarda duas colunas `numeric` em cada entrada. Esse espaço é o custo de não ler o heap no resumo.

### O que **não** prometemos

- **Q5c (todo o histórico) continua com Seq Scan.** Quando a consulta lê 100% das linhas, o planner considera o scan sequencial paralelo mais barato, e ele está certo. O índice covering só ajuda quando há filtro de período, que é o caso do resumo (`period.from`).
- **Q1a/Q1b usam o índice de `timestamp`, e não o composto `(service_id, "timestamp")`.** O planner prefere o índice de tempo porque ele acompanha a ordem física das linhas (correlação próxima de 1), mesmo descartando cerca de 26 mil linhas pelo `Filter`. Não forçamos nada. Com muitos serviços ou janelas longas, essa escolha pode mudar sozinha para o composto, que continua disponível.
- **Q1c ficou praticamente igual.** Sem `idx_metric_collections_service_id`, o bitmap passa a usar o composto, que é maior (cerca de 700 buffers a mais no índice), mas o tempo total não mudou. O `Sort` vai para disco (`external merge`, cerca de 9 MB) porque devolve 86 mil linhas largas, e isso é custo da API sem paginação, não de índice. O frontend não chama essa variação.
- Ganhos de tempo de poucos milissegundos com cache quente são modestos neste volume. O ganho que aparece de forma consistente é em **buffers lidos**, e ele cresce quando os dados não cabem no cache.

## 4. Índice em `services.status`: por que não foi criado

`scripts/db-bench/04-status-index-check.sql` cria o índice dentro de uma transação, mede e faz `ROLLBACK`:

- **Volume real (10 serviços, 1 página de heap):** Q3, Q4 e um filtro seletivo (`status = 'UNAVAILABLE'`) usam **Seq Scan** mesmo com o índice disponível, em cerca de 0,02 ms. Não há como melhorar a leitura de uma única página.
- **Volume 100× maior (1.010 serviços), só como referência:** `GROUP BY status` continua com Seq Scan. Só o filtro seletivo `status = 'UNAVAILABLE'` passaria a usar o índice (0,04 ms), e nenhuma consulta do sistema faz esse filtro. O `collectCycle` filtra por **todos** os valores do enum, ou seja, lê a tabela inteira.

Pelo critério "índice de status somente se a consulta beneficiar dele", ele não foi criado. Se no futuro aparecer uma consulta seletiva por status numa tabela com milhares de serviços, basta rodar o script 04 de novo para reavaliar.

## 5. Reversibilidade (verificado)

1. Banco limpo + migrations antigas → `up` → `down` → `up`: sem erros.
2. A lista de índices após o `down` é **idêntica** (`pg_indexes`) à gerada só pelas migrations anteriores.
3. Com o banco populado (864 mil linhas), `up` e `down` rodaram normalmente.

> Observação de deploy: `CREATE INDEX` comum bloqueia escritas em `metric_collections` enquanto o índice é construído (cerca de 0,3 s com 864 mil linhas). Para o volume do projeto isso é aceitável. `CREATE INDEX CONCURRENTLY` exigiria desligar a transação da migration (`transaction = false`) e foi descartado para manter o padrão das demais migrations.

## 6. Como reproduzir

```bash
cd greener/backend
npm run migration:run                       # aplica até a TASK-028
docker compose stop greener-backend         # o coletor alteraria os serviços fictícios
# ⚠️ o seed APAGA services/metric_collections — use um banco de teste
psql "$DATABASE_URL" -v services=10 -v days=30 -f scripts/db-bench/01-seed-sample.sql
psql "$DATABASE_URL" -f scripts/db-bench/02-explain-queries.sql      # EXPLAIN (ANALYZE, BUFFERS)
PSQL="psql $DATABASE_URL" scripts/db-bench/03-bench-timing.sh 15      # medianas
psql "$DATABASE_URL" -f scripts/db-bench/04-status-index-check.sql   # índice de status
npm run migration:revert                    # compara com o "antes"
```
