# Frontend: origem dos dados e o que falta no backend

O Observatório e a Área do Administrador foram portados do protótipo visual da equipe (Next.js) para o frontend do projeto
(Vite + React). O **login é real** (`POST /api/auth/login`).

## Dois modos (variável `VITE_DATA_SOURCE`)

- **`api` (padrão)**: lê os serviços reais em `GET /api/services` (rota pública do backend). Mostra nome, estado
  (`ACTIVE`, `UNAVAILABLE`, `NO_METRICS`), país, região, cidade e coordenadas. Tudo o que o backend ainda não fornece aparece
  como "—" (nunca como zero) ou como aviso: energia, CO₂e, intensidade de carbono, potência, CPU/memória/disco/rede,
  gráfico de evolução e ranking de impacto. O horário exibido é o horário real.
- **`simulated`**: simulação no navegador para demonstração (coleta acelerada, cada coleta ≙ 15 min simulados, e por isso
  o horário da tabela avança de 15 em 15 min enquanto o relógio do topo mostra a hora real).

O adaptador do modo real está em `src/services/backend-services.ts` (com testes em `tests/backend-services.test.ts`).

## Arquitetura alvo

O navegador chama **somente o backend do GreenER**. O worker do backend coleta no Agregador de Métricas e na API de
Intensidade de Carbono, calcula energia e CO2e (W = CPU%/100 × 100 + 0,375 × RAM + 0,01 × disco + 0,02 × rede;
kWh = W × horas ÷ 1000; CO2e = kWh × gCO2e/kWh), grava no PostgreSQL e expõe os resultados. O frontend consulta
periodicamente (Ajax/polling) e só exibe. O cálculo que existe em `src/lib/calculations.ts` serve apenas à simulação e deve
ficar no backend.

## O que o backend precisa expor (proposta)

| Dado na tela | Estado hoje | Endpoint necessário |
|---|---|---|
| Lista de serviços, estado e localização | **Real** (`GET /api/services`) | já existe |
| Métricas da última coleta por serviço (CPU, memória, disco, rede) | falta | incluir em `GET /api/services` ou `GET /api/services/:id/latest` |
| Energia, CO2e, intensidade (gCO2e/kWh) e % renovável por serviço e período | falta | calculados pelo worker; `GET /api/dashboard/summary?period=` |
| Série temporal para o gráfico e o ranking | falta | `GET /api/dashboard/series?period=` |
| Eventos do ambiente (serviço descoberto, removido, indisponível) | derivados no front a partir da diferença entre consultas | `GET /api/events` (opcional) |
| Histórico de coletas e CSV (RF10) | vazio no modo real (acumulado só na sessão do navegador) | `GET /api/collections?service=&status=&limit=&page=` (JWT) |
| Configurações de monitoramento (RF16) | salvas no `localStorage` do navegador | `GET` e `PUT /api/settings` (JWT) |

## Pontos a alinhar com a equipe

- `GET /api/services` devolve `latitude`/`longitude` como texto (colunas `numeric`); o front converte. Não há `region_code`,
  então o front usa a região como código enquanto a API de carbono não for integrada.
- O CORS do backend precisa liberar a origem do frontend (`http://localhost:3000` em desenvolvimento).
- Ao integrar os novos endpoints, basta estender `src/services/backend-services.ts`; as telas já tratam valores nulos.
