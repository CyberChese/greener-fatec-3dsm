# Plano de Entregas — GreenER

Este documento distribui os critérios da rubrica de avaliação entre as três sprints, conforme o item 6 da rubrica.
Os critérios e suas pontuações não foram alterados.

- **GA01 a GA09 e DW01** são avaliados em todas as sprints.
- Os demais critérios foram distribuídos de modo que todos os requisitos obrigatórios estejam contemplados até a Sprint 3.
- Quando um critério aparece em mais de uma sprint, a coluna **Entrega concreta** descreve a evolução prevista em cada uma.
- Alterações neste plano ficam registradas na seção [Histórico de alterações](#histórico-de-alterações).

> **Situação da validação:** distribuição proposta pela equipe. Registrar aqui a data da validação pelo professor.

---

## Visão geral da distribuição

| Critério | Sprint 1 | Sprint 2 | Sprint 3 |
|---|:---:|:---:|:---:|
| GA01 a GA09 — Gestão ágil | ✔ | ✔ | ✔ |
| DW01 — Tecnologias obrigatórias | ✔ | ✔ | ✔ |
| DW02 — Integração com APIs auxiliares | ✔ descoberta e métricas | ✔ intensidade de carbono | |
| DW03 — Estrutura do backend e API REST | ✔ módulos iniciais | ✔ repositories e novos recursos | ✔ revisão final |
| DW04 — Persistência com PostgreSQL e ORM | ✔ | ✔ novas tabelas | |
| DW05 — Organização e integração do frontend | ✔ | ✔ dashboard | |
| DW06 — Autenticação e proteção | ✔ RF16 | ✔ RF17 | |
| DW07 — Execução e documentação da API | ✔ | ✔ | ✔ |
| TP01 — Responsabilidades e SOLID | | ✔ | |
| TP02 — Injeção de dependências | ✔ | | |
| TP03 — Tipagem e legibilidade | | ✔ | |
| TP04 — Testes unitários | ✔ coletor e autenticação | ✔ cálculos | |
| TP05 — Validação e exceções | ✔ | | |
| IHC01 — Usuários e tarefas | ✔ | | |
| IHC02 — Fluxos e protótipos | ✔ | | |
| IHC03 — Clareza dos indicadores | | ✔ | |
| IHC04 — Responsividade e feedback | | ✔ | |
| IHC05 — Avaliação de usabilidade | | | ✔ |
| IHC06 — Melhorias decorrentes da avaliação | | | ✔ |

---

## Sprint 1 — 29/09/2026 a 20/10/2026

**Objetivo:** estabelecer a infraestrutura da plataforma (Docker, PostgreSQL, NestJS e React), a autenticação administrativa via JWT e o motor de descoberta de serviços e coleta periódica de métricas.

Detalhamento das tasks, histórias e critérios de aceite: [`sprints/sprint-1.md`](sprints/sprint-1.md).
Quadro do projeto: [GitHub Projects](https://github.com/orgs/CyberChese/projects/2/views/3).

### Critérios previstos

| Código | Requisito relacionado | Entrega concreta | Como verificar | Responsáveis | Evidência no GitHub | Situação |
|---|---|---|---|---|---|---|
| GA01 | Gestão ágil | Product Backlog com histórias e tasks priorizadas | Abrir o quadro do GitHub Projects e conferir itens, descrições e prioridades | Lucas Cobra (PO) | [GitHub Projects](https://github.com/orgs/CyberChese/projects/2/views/3) | Concluído |
| GA02 | Gestão ágil | Sprint Backlog com objetivo, tasks, responsáveis, pontos e capacidade | Conferir a seção de planejamento da sprint | Gabriel Moura (SM) | [`sprint-1.md`](sprints/sprint-1.md#-tabela-de-tasks--sprint-1) | Concluído |
| GA03 | Gestão ágil | Histórias US-01 a US-06 com critérios de aceite verificáveis | Ler as histórias e seus critérios | Lucas Cobra (PO) | [`sprint-1.md`](sprints/sprint-1.md#-user-stories--sprint-1) | Concluído |
| GA04 | Gestão ágil | Tasks atualizadas no quadro e vinculadas a commits e PRs | Conferir a evolução dos cards e os PRs vinculados | Gabriel Moura (SM) | [GitHub Projects](https://github.com/orgs/CyberChese/projects/2/views/3) | Concluído |
| GA05 | Gestão ágil | Desenvolvimento distribuído ao longo da sprint | Conferir o histórico de commits e PRs da branch `dev` | Toda a equipe | Histórico de commits da branch `dev` | Concluído |
| GA06 | Gestão ágil | Sprint Review e retrospectiva com ações de melhoria | Ler as seções de Review e Retrospectiva | Gabriel Moura (SM) | [`sprint-1.md`](sprints/sprint-1.md#-sprint-review) | Concluído |
| GA07 | Gestão ágil | Definition of Done versionada e aplicada às tasks | Ler a DoD e a tabela de situação das tasks | Gabriel Moura (SM) | [`sprint-1.md`](sprints/sprint-1.md#-definition-of-done-dod) | Concluído |
| GA08 | Gestão ágil | README e documentação atualizados para a versão entregue | Seguir o passo a passo do README | Gabriel Moura | [`README.md`](../../README.md), [`docs/README.md`](README.md) | Concluído |
| GA09 | Gestão ágil | Participação de todos os integrantes | Conferir a tabela de integrantes abaixo | Toda a equipe | [Tabela de integrantes](#integrantes-e-contribuições--sprint-1) | Concluído |
| DW01 | RP01, RP02 | React + TypeScript no frontend e NestJS + TypeScript no backend | Conferir `package.json` e código de cada aplicação | Lucas Cobra, Luka Gomes | [`backend/package.json`](../backend/package.json), [`frontend/package.json`](../frontend/package.json) | Concluído |
| DW02 | RF01, RF02, RF03, RF12 | Descoberta de serviços no Agregador e coleta periódica de métricas | Subir o ambiente e consultar `GET /api/services` e `GET /api/services/:id/history` | Ronaldo, Gabriel Moura, Gustavo Zago | [`modules/aggregator`](../backend/src/modules/aggregator), [`metrics.service.ts`](../backend/src/metrics/metrics.service.ts) | Parcial — a descoberta é executada apenas na inicialização do backend (ver pendências) |
| DW03 | RP02 | Módulos `auth`, `services`, `metrics` e `aggregator` com controllers e services | Conferir a organização dos módulos e as rotas em [`api.md`](api.md) | Lucas Cobra, Gustavo Zago | [`backend/src`](../backend/src) | Parcial — camada de repositories prevista para a Sprint 2 |
| DW04 | RF04, RF10, RP03 | Esquema `users`, `services` e `metric_collections` por migrações TypeORM | Aplicar as migrações em banco vazio e verificar gravação e leitura das coletas | Isabelly Marinho, Lucas Cobra | [`migrations`](../backend/src/migrations), [`entities`](../backend/src/entities) | Concluído |
| DW05 | RP01 | Estrutura com pages, components, services, hooks, contexts e providers consumindo a API | Conferir `frontend/src` e o login e a tela inicial em execução | Luka Gomes | [`frontend/src`](../frontend/src) | Concluído |
| DW06 | RF16, RNF07 | Login com JWT, senha com bcrypt e guard nas rotas protegidas | `POST /api/auth/login` e `GET /api/auth/profile` com e sem token | Lucas Cobra, Luka Gomes | [`backend/src/auth`](../backend/src/auth) | Concluído |
| DW07 | RNF05, RNF06, RNF08 | Docker Compose, `.env.example`, README e documentação dos endpoints | Seguir o README e conferir [`api.md`](api.md) | Lucas Cobra, Gabriel Moura | [`compose.yaml`](../../compose.yaml), [`.env.example`](../../.env.example), [`api.md`](api.md) | Parcial — testes não executam dentro do container (ver pendências) |
| TP02 | RP02 | Services, repositories do ORM e cliente HTTP recebidos por injeção | Conferir os construtores e os testes com doubles | Lucas Cobra, Gustavo Zago | [`metrics.service.spec.ts`](../backend/src/metrics/metrics.service.spec.ts), [`auth.service.spec.ts`](../backend/src/auth/auth.service.spec.ts) | Concluído |
| TP04 | RNF07 | Testes unitários do coletor, da descoberta, do cliente do Agregador e da autenticação | Executar `npm test` no backend | Isabelly Marinho | Arquivos `*.spec.ts` em [`backend/src`](../backend/src) | Concluído (20 testes) |
| TP05 | RNF02, RP07 | DTO de login, `ValidationPipe`, validação de UUID e datas, erros tipados do Agregador | Enviar dados inválidos para as rotas e conferir as respostas 400/401/404 | Lucas Cobra, Gustavo Zago | [`login.dto.ts`](../backend/src/auth/dto/login.dto.ts), [`aggregator.errors.ts`](../backend/src/modules/aggregator/aggregator.errors.ts) | Concluído |
| IHC01 | RP09 | Descrição dos usuários e das tarefas prioritárias | Ler a seção de usuários e tarefas | Ronaldo | [`interface.md`](interface.md#1-usuários-e-tarefas) | Concluído |
| IHC02 | RP09 | Wireframes, design system e protótipo navegável no Figma | Abrir o protótipo e percorrer o fluxo documentado | Ronaldo | [`interface.md`](interface.md#2-protótipos-e-fluxo-de-navegação) | Concluído |

### Pendências da Sprint 1 e nova previsão

| Pendência | Critério | Nova previsão |
|---|---|---|
| Executar a descoberta de serviços periodicamente, e não apenas na inicialização | DW02 | Sprint 2 |
| Persistir o `region_code` do Agregador, necessário para a intensidade de carbono | DW02 | Sprint 2 |
| Atualizar a imagem do backend para Node 24, permitindo rodar os testes dentro do container | DW07, TP04 | Sprint 2 |
| Criar a camada de repositories e separar responsabilidades do `MetricsService` | DW03, TP01 | Sprint 2 |
| Remover código sem uso (`modules/coletas.*`, `services/entities/service.entity.ts`) | TP03 | Sprint 2 |
| Configurar Swagger em `/api/docs` | DW07 | Sprint 2 |

### Integrantes e contribuições — Sprint 1

| Integrante | Tarefas assumidas | Contribuições realizadas | Evidências no GitHub |
|---|---|---|---|
| Gabriel Moura (`@gafmoura7`) — Scrum Master | TASK-014, TASK-018, TASK-019 | Upsert de serviços com metadados de localização, README com instruções Docker e acompanhamento do burndown | [`service-discovery.service.ts`](../backend/src/modules/aggregator/service-discovery.service.ts), [`README.md`](../../README.md), [`sprint-1.md`](sprints/sprint-1.md) |
| Lucas Fernando Cobra (`@LucasCobraFatec`) — Product Owner | TASK-001, TASK-002, TASK-010, TASK-011 | Docker Compose, bootstrap do NestJS com TypeORM, DTO de login, bcrypt, JWT, `AuthController` e `JwtAuthGuard` | [`compose.yaml`](../../compose.yaml), [`app.module.ts`](../backend/src/app.module.ts), [`backend/src/auth`](../backend/src/auth) |
| Luka Gomes (`@LukaGomes`) | TASK-008, TASK-009, TASK-012 | Estrutura do frontend, cliente Axios, rotas públicas e protegidas, modal de login e estado de autenticação | [`frontend/src`](../frontend/src), [`frontend/README.md`](../frontend/README.md) |
| Gustavo Zago de Lima (`@Gustavo-Zago`) | TASK-004, TASK-015, TASK-016 | Diagrama de casos de uso, coleta periódica de métricas e tratamento de `UNAVAILABLE` e `NO_METRICS` | [`UserCase.pdf`](diagramas/UserCase.pdf), [`metrics.service.ts`](../backend/src/metrics/metrics.service.ts) |
| Isabelly Marinho (`@isabellymarinho20`) | TASK-003, TASK-005, TASK-017 | Modelagem do banco (DER), esquema PostgreSQL e testes unitários | [`DER_GreenER.png`](diagramas/DER_GreenER.png), [`migrations`](../backend/src/migrations), [`auth.service.spec.ts`](../backend/src/auth/auth.service.spec.ts) |
| Ronaldo (`@RonaldoAvilaa`) | TASK-006, TASK-007, TASK-013 | Wireframes, design system, protótipo navegável, avaliação inicial e cliente HTTP do Agregador | [`interface.md`](interface.md), [`relatorio-usabilidade.md`](ihc/relatorio-usabilidade.md), [`aggregator-client.service.ts`](../backend/src/modules/aggregator/aggregator-client.service.ts) |

> Os links de pull requests e issues de cada task estão no [GitHub Projects](https://github.com/orgs/CyberChese/projects/2/views/3).

---

## Sprint 2 — planejamento previsto

**Objetivo previsto:** converter métricas em estimativas de energia (kWh) e CO₂e usando a intensidade de carbono por região e apresentar o dashboard operacional.

| Código | Requisito relacionado | Entrega concreta prevista | Como verificar | Situação |
|---|---|---|---|---|
| GA01 a GA09 | Gestão ágil | Planejamento, acompanhamento, review e retrospectiva da Sprint 2 | [`sprint-2.md`](sprints/sprint-2.md) | Previsto |
| DW01 | RP01, RP02 | Manter React + TS e NestJS + TS | Conferir dependências e código | Previsto |
| DW02 | Intensidade de carbono | Consultar o serviço de intensidade de carbono por região; descoberta periódica | Executar a consulta e conferir o tratamento das respostas | Previsto |
| DW03 | RP02 | Repositories por módulo e novos endpoints de consulta | Conferir módulos e [`api.md`](api.md) | Previsto |
| DW04 | RP03 | Migrações para os dados de estimativa | Aplicar migrações em banco vazio | Previsto |
| DW05 | Dashboard | Dashboard com serviços, estados e indicadores consumindo a API | Executar o frontend | Previsto |
| DW06 | RF17 | Rotas administrativas protegidas por JWT | Chamar as rotas com e sem token | Previsto |
| DW07 | RNF08 | Swagger e documentação atualizada | Abrir `/api/docs` | Previsto |
| TP01 | RP02 | Separar agendamento, validação de contrato e persistência do coletor | Conferir as classes | Previsto |
| TP03 | — | Remover `any` e código sem uso | Conferir o código | Previsto |
| TP04 | — | Testes das regras de cálculo de energia e CO₂e | `npm test` | Previsto |
| IHC03 | — | Indicadores com unidade, período e última atualização | Conferir as telas | Previsto |
| IHC04 | — | Estados de carregamento, ausência de dados, indisponibilidade e erro; verificação de responsividade | Conferir as telas e [`interface.md`](interface.md) | Previsto |

## Sprint 3 — planejamento previsto

**Objetivo previsto:** concluir rankings e comparações, avaliar a usabilidade com usuários representativos e aplicar as melhorias.

| Código | Entrega concreta prevista | Situação |
|---|---|---|
| GA01 a GA09 | Gestão da Sprint 3 e avaliação final com pendências | Previsto |
| DW01, DW03, DW07 | Revisão final da API, da documentação e dos comandos de execução | Previsto |
| IHC05 | Avaliação de usabilidade com usuários representativos, com roteiro e resultados registrados | Previsto |
| IHC06 | Mudanças justificadas pelos problemas encontrados e vinculadas a issues | Previsto |

---

## Histórico de alterações

| Data | Alteração | Motivo |
|---|---|---|
| 19/10/2026 | Registro do plano das três sprints, da situação dos critérios da Sprint 1 e das pendências com nova previsão | Atender ao item 6 da rubrica e documentar o fechamento da Sprint 1 |
