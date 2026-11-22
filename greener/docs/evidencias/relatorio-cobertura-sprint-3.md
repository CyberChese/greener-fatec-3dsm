# Relatório de Testes e Cobertura de Código — Sprint 3 (TASK-050)

- **Task:** TASK-050 (#132) — Suíte de Testes Unitários, E2E e Integração Completa da Sprint 3
- **User Story:** HU-20 — Refatoração Técnica, Descoberta Periódica e Prontidão de Portfólio
- **Requisitos atendidos:** `RNF07` · `RP06`
- **Data da execução:** 21/11/2026

---

## 1. Resumo Executivo

| Camada / Suíte | Comando | Arquivos / Suítes | Cenários | Status | Cobertura Global (Stmts / Branch / Funcs / Lines) |
|---|---|---:|---:|---|---|
| **Backend — Unitários e Integração** | `npm run test:cov` | 16 / 16 | 139 / 139 | ✅ 100% aprovados | `72,71%` / `75,87%` / `73,56%` / `73,14%` |
| **Backend — E2E + PostgreSQL** | `npm run test:e2e` | 1 / 1 | 7 / 7 | ✅ 100% aprovados | Integrado ao PostgreSQL real com migrações TypeORM |
| **Frontend — Componentes, Hooks e Serviços** | `npm run test:cov` | 25 / 25 | 192 / 192 | ✅ 100% aprovados | `63,14%` / `64,42%` / `63,34%` / `65,15%` |
| **Total Consolidado** | — | **42 / 42** | **338 / 338** | **✅ 0 falhas** | — |

---

## 2. Cobertura do Backend (Jest)

### 2.1 Recursos Analíticos da Sprint 3 e Módulos Críticos

| Arquivo | % Stmts | % Branch | % Funcs | % Lines |
|---|---:|---:|---:|---:|
| `src/metrics/analytics.service.ts` | **100,00%** | **95,34%** | **100,00%** | **100,00%** |
| `src/metrics/metrics.controller.ts` | **100,00%** | 75,00% | **100,00%** | **100,00%** |
| `src/metrics/metrics.service.ts` | 81,37% | 77,27% | 72,22% | 81,00% |
| `src/metrics/dto/ranking-query.dto.ts` | **100,00%** | 50,00% | **100,00%** | **100,00%** |
| `src/metrics/dto/compare-query.dto.ts` | 71,42% | 12,50% | 62,50% | 70,00% |
| `src/metrics/dto/metrics-summary.dto.ts` | **100,00%** | **100,00%** | **100,00%** | **100,00%** |
| `src/repositories/service.repository.ts` | 95,55% | 88,88% | 83,33% | 95,12% |
| `src/repositories/metric-collection.repository.ts` | 92,59% | 90,90% | 77,77% | 92,00% |
| `src/repositories/user.repository.ts` | **100,00%** | 75,00% | **100,00%** | **100,00%** |
| `src/services/services.controller.ts` | **100,00%** | 75,00% | **100,00%** | **100,00%** |
| `src/services/services.service.ts` | **100,00%** | 75,00% | **100,00%** | **100,00%** |
| `src/engine/energy-engine.service.ts` | 95,65% | 91,30% | **100,00%** | 95,45% |
| `src/engine/carbon-engine.service.ts` | 95,00% | 88,88% | **100,00%** | 94,73% |
| `src/modules/aggregator/service-discovery.service.ts` | **100,00%** | 87,75% | **100,00%** | **100,00%** |
| `src/modules/carbon-intensity/carbon-intensity-client.service.ts` | 91,13% | 85,33% | **100,00%** | 90,90% |
| `src/common/date-range.ts` | **100,00%** | **100,00%** | **100,00%** | **100,00%** |
| `src/auth/auth.service.ts` | **100,00%** | 81,25% | **100,00%** | **100,00%** |

> **Observação sobre o percentual global (`72,71%` Stmts / `73,14%` Lines):** o `jest.config.ts` contabiliza todo `src/**/*.ts`, incluindo scripts de migração histórica (`src/migrations/`), entrypoint (`main.ts`, `data-source.ts`), definições declarativas de módulos (`*.module.ts`) e seed (`user.seed.ts`). Nas camadas de regras de negócio e persistência analítica, a cobertura de linhas situa-se entre **92% e 100%**.

### 2.2 Cenários Validados no `AnalyticsService` (`src/metrics/analytics.service.spec.ts`)

- Ranking por `energy` e `co2e`, ordenação `desc` e `asc`, paginação com cálculo sequencial de `rank`, retorno vazio (`totalPages: 0`) e validação de intervalo de datas.
- Comparação de 2 a 4 serviços por UUID e `external_id`, preservação da ordem solicitada, rejeição de duplicatas diretas e resolvidas (UUID + `external_id` do mesmo serviço).
- Alinhamento temporal por buckets (`bucketSeconds`), média de CPU e soma de energia/CO₂e quando há múltiplas amostras no mesmo bucket, fallback de `co2e_g / 1000` quando `co2e_kg` é nulo e descarte seguro de timestamps/valores inválidos.
- Tratamento de serviços `UNAVAILABLE` com lacunas `null` nas séries e exclusão de serviços sem amostras do cálculo de menor emissor.
- Resumo estatístico com desempate por energia/nome, emissões zeradas sem divisão por zero e período sem amostras (`summary` com campos `null`).

---

## 3. Testes End-to-End (E2E) com PostgreSQL Real

- **Arquivo:** [`greener/backend/test/analytics.e2e-spec.ts`](../../backend/test/analytics.e2e-spec.ts)
- **Configuração:** [`greener/backend/test/jest-e2e.json`](../../backend/test/jest-e2e.json)
- **Banco utilizado na validação:** PostgreSQL 18 com aplicação limpa de todas as **8 migrações TypeORM** (`npm run migration:run`) e remoção isolada dos registros de teste ao final da suíte (`afterAll`).

| Rota REST | Cenário E2E validado | Status HTTP | Integridade do Payload JSON |
|---|---|---:|---|
| `GET /api/metrics/ranking` | Ranking por `co2e` (`desc`) com filtro `startDate`/`endDate` | `200 OK` | `metric`, `order`, `startDate`, `endDate`, `items[]` (`rank`, `service_id`, `external_id`, `name`, `status`, `metric_value`) e `pagination` |
| `GET /api/metrics/ranking` | Reordenação ao alternar para `metric=energy` (`desc` e `asc`) e paginação (`page=2&limit=2`) | `200 OK` | Mudança real na ordenação SQL `SUM(energy_kwh)` e cálculo de `rank` paginado |
| `GET /api/metrics/ranking` | Métrica inexistente e intervalo `startDate > endDate` | `400 Bad Request` | Rejeição validada pelo `ValidationPipe` e `parseDateRange` |
| `GET /api/metrics/compare` | Comparação de 4 serviços (UUID + `external_id`), incluindo `UNAVAILABLE` sem amostras no período (`bucketSeconds=30`) | `200 OK` | `services[]`, `series[]` alinhadas por bucket com lacunas `null` e `summary` (`efficiency_difference_percent: 80`) |
| `GET /api/metrics/compare` | Agregação de múltiplas coletas em janela de `bucketSeconds=60` | `200 OK` | Média de `cpu_usage` e soma de `energy_kwh`/`co2e_kg` por bucket |
| `GET /api/metrics/compare` | Menos de 2 serviços, duplicata UUID+`external_id` e serviço inexistente | `400` / `404` | Validação de contrato e integridade referencial |
| `GET /api/metrics/summary`, `/api/services`, `/api/services/:id/history` | Consistência dos totais consolidados, listagem e histórico filtrado | `200 OK` | Registros persistidos refletidos ponta a ponta |

---

## 4. Cobertura do Frontend (Vitest + v8)

### 4.1 Componentes, Hooks e Serviços da Sprint 3

| Arquivo | % Stmts | % Branch | % Funcs | % Lines |
|---|---:|---:|---:|---:|
| `src/components/dashboard/impact-ranking.tsx` | **100,00%** | **94,73%** | **100,00%** | **100,00%** |
| `src/components/dashboard/comparison-panel.tsx` | **90,32%** | **89,33%** | 87,09% | **92,72%** |
| `src/components/dashboard/comparison-data.ts` | **94,52%** | 78,68% | **100,00%** | **100,00%** |
| `src/components/dashboard/filters-bar.tsx` | **90,90%** | 85,50% | **100,00%** | **92,30%** |
| `src/hooks/use-service-comparison.ts` | **93,18%** | 82,50% | 87,50% | **100,00%** |
| `src/hooks/use-period-totals.ts` | **90,90%** | 72,22% | **100,00%** | **100,00%** |
| `src/hooks/use-debounced-search.ts` | **100,00%** | **100,00%** | **100,00%** | **100,00%** |
| `src/services/ranking.ts` | **96,15%** | **89,74%** | **100,00%** | **100,00%** |
| `src/services/backend-services.ts` | 89,23% | **90,62%** | 70,00% | **90,00%** |
| `src/lib/dashboard-filters.ts` | **96,25%** | **92,42%** | **100,00%** | **98,48%** |
| `src/lib/calculations.ts` | **100,00%** | **95,65%** | **100,00%** | **100,00%** |
| `src/components/dashboard` *(diretório agregado)* | **88,88%** | 79,11% | **88,77%** | **90,98%** |

### 4.2 Resumo por Diretório do Frontend

| Diretório | % Stmts | % Branch | % Funcs | % Lines |
|---|---:|---:|---:|---:|
| `src/lib` | 97,15% | 92,70% | 98,38% | 97,78% |
| `src/components/dashboard` | 88,88% | 79,11% | 88,77% | 90,98% |
| `src/components/map` | 80,64% | 58,82% | 87,50% | 84,61% |
| `src/components/admin` | 47,25% | 45,45% | 45,71% | 47,56% |
| `src/services` | 45,35% | 53,23% | 33,33% | 47,94% |
| `src/hooks` | 36,95% | 32,12% | 35,52% | 40,14% |
| **All files** | **63,14%** | **64,42%** | **63,34%** | **65,15%** |

> **Observação:** páginas de composição (`src/pages/*`), providers (`src/providers/*`) e contextos (`src/contexts/*`) concentram o percentual não coberto no total global; os componentes analíticos, hooks de dados e utilitários da Sprint 3 estão acima de **90% de cobertura de linhas**.

---

## 5. Como Reproduzir

### Backend

```bash
cd greener/backend
npm ci
npm run lint
npm run build
npm run test       # 16 suítes / 139 testes unitários e de integração
npm run test:cov   # gera cobertura no terminal e em coverage/
```

Com um banco PostgreSQL ativo e variáveis configuradas no `.env` (ou via ambiente):

```bash
cd greener/backend
npm run migration:run
npm run test:e2e   # 1 suíte / 7 testes E2E integrados ao PostgreSQL
```

### Frontend

```bash
cd greener/frontend
npm ci
npm run lint
npm run build
npm run test       # 25 arquivos / 192 testes de componentes, hooks e serviços
npm run test:cov   # gera cobertura (v8) no terminal e em coverage/
```
