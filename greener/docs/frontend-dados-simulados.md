# Frontend: origem dos dados e o que falta no backend

O Observatório e a Área do Administrador foram portados do protótipo visual da equipe (Next.js) para o frontend do projeto
(Vite + React). O **login é real** (`POST /api/auth/login`).

## Dois modos (variável `VITE_DATA_SOURCE`)

- **`api` (padrão)**: lê os serviços reais em `GET /api/services` e, para os ativos, a coleta mais recente em
  `GET /api/services/:id/history` (consulta com `from` dos últimos 15 min, repetida no máximo a cada 10 s, já que o worker
  coleta a cada ~30 s). Mostra nome, estado (`ACTIVE`, `UNAVAILABLE`, `NO_METRICS`), localização e CPU/memória/disco/rede com
  o horário da coleta. A Área do Administrador lista o histórico real de um serviço (período à escolha) e exporta CSV.
  O horário exibido é o horário real. O backend já persiste energia, CO₂e, intensidade de carbono e o uso de fallback no
  histórico; esses campos ainda aparecem como "—" no frontend enquanto o adaptador real não os mapeia. Potência, gráfico
  de evolução e ranking também ainda não são apresentados no modo `api`.
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
| Métricas da última coleta por serviço (CPU, memória, disco, rede) | **Real** (última linha de `GET /api/services/:id/history`) | já existe; um `GET /api/services/:id/latest` evitaria 1 consulta por serviço |
| Energia, CO2e e intensidade (gCO2e/kWh) por coleta | Persistidos no histórico pelo worker; ainda não mapeados pelo adaptador | `GET /api/services/:id/history` |
| % renovável por serviço e período | falta | API atual não persiste esse dado |
| Resumo agregado por período | falta | `GET /api/dashboard/summary?period=` (proposta) |
| Série temporal para o gráfico e o ranking | falta | `GET /api/dashboard/series?period=` |
| Eventos do ambiente (serviço descoberto, removido, indisponível) | derivados no front a partir da diferença entre consultas | `GET /api/events` (opcional) |
| Histórico de coletas e CSV (RF10) | **Real** por serviço (`GET /api/services/:id/history?from=&to=`) | já existe; paginação e filtro por estado seriam úteis, e a rota pública poderia exigir JWT na área admin |
| Configurações de monitoramento (RF16) | salvas no `localStorage` do navegador | `GET` e `PUT /api/settings` (JWT) |

## Pontos a alinhar com a equipe

- O histórico devolve CPU em %, memória/disco/rede em GB, como texto numérico; o front converte. Coleta com algum valor
  nulo é tratada como sem métricas (o front não preenche com zero).
- `GET /api/services` devolve `latitude`/`longitude` como texto (colunas `numeric`); o front converte. `region_code` é
  persistido e retornado pelo backend para a integração de carbono.
- O CORS do backend precisa liberar a origem do frontend (`http://localhost:3000` em desenvolvimento).
- Ao integrar os novos endpoints, basta estender `src/services/backend-services.ts`; as telas já tratam valores nulos.
