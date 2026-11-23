# Relatório Final de Encerramento — GreenER

## 1. Identificação

| Campo | Informação |
|---|---|
| Projeto | GreenER — Plataforma para Estimativa do Impacto Ambiental de Aplicações de Software |
| Curso | Desenvolvimento de Software Multiplataforma — FATEC Jacareí |
| Período | 2026-2 |
| Sprint encerrada | Sprint 3 — Comparações, Usabilidade e Entrega Final |
| Pontos acompanhados | 47 pontos |
| Situação | Entregas técnicas e documentação de encerramento concluídas |

## 2. Resumo executivo

O GreenER descobre serviços de software, coleta métricas de infraestrutura e transforma os dados em estimativas de consumo energético e emissões de CO₂e. O produto foi desenvolvido com React, NestJS, PostgreSQL e Docker Compose, com integração ao Agregador de Métricas e à API de intensidade de carbono.

Ao longo das três sprints, foram entregues a fundação da aplicação, autenticação, descoberta e coleta de métricas, cálculo ambiental, dashboard, ranking, comparação, filtros, testes, documentação técnica e estrutura de portfólio.

O burndown da Sprint 3 registra a redução dos 47 pontos planejados até zero. A demonstração final foi publicada e a avaliação com usuários representativos foi realizada, com as melhorias correspondentes registradas na documentação de IHC.

## 3. Entregas por sprint

| Sprint | Principais entregas | Evidências |
|---|---|---|
| Sprint 1 | Docker Compose, PostgreSQL, NestJS, React, autenticação JWT, descoberta e coleta inicial | [Sprint 1](sprints/sprint-1.md) |
| Sprint 2 | Energia, CO₂e, intensidade de carbono, fallback, resumo público, dashboard e TASK-040 | [Sprint 2](sprints/sprint-2.md) |
| Sprint 3 | Ranking, comparação, filtros, repositories, descoberta periódica, testes, Swagger e revisão documental | [Sprint 3](sprints/sprint-3.md) |

## 4. Arquitetura e execução

O frontend React acessa somente a API NestJS. O backend consulta o Agregador e a API de intensidade de carbono, persiste os dados no PostgreSQL por meio do TypeORM e expõe os resultados ao dashboard.

- [Arquitetura e fluxo de dados](arquitetura.md)
- [README principal e execução com Docker](../../README.md)
- [API REST e contratos](api.md)
- [Swagger UI](http://localhost:3001/api/docs)
- [OpenAPI JSON](http://localhost:3001/api/docs/openapi.json)
- [Guia de portfólio](guia-portfolio.md)

## 5. Matriz de atendimento aos requisitos

### Requisitos funcionais

| Requisito | Atendimento | Evidência |
|---|---|---|
| RF01–RF06 | Concluído: descoberta, metadados, coleta periódica, persistência e estados dos serviços | [Contrato do Agregador](contrato-agregador.md), [API](api.md), código de descoberta e métricas |
| RF07–RF09 | Concluído: região, intensidade de carbono, localização e indicadores ambientais | [Cálculos](calculos.md), [Contrato de intensidade de carbono](contrato-intensidade-carbono.md), [Interface](interface.md) |
| RF10 | Concluído: histórico, ranking e consultas ambientais | `GET /api/services/:id/history` e `GET /api/metrics/ranking` |
| RF11 | Concluído: comparação de 2 a 4 serviços com séries alinhadas | `GET /api/metrics/compare` |
| RF12 | Concluído: filtros temporais, busca e integração HTTP resiliente | [API](api.md) e implementação dos filtros do frontend |
| RF16 | Concluído: autenticação administrativa com JWT e bcrypt | `POST /api/auth/login` e `GET /api/auth/profile` |
| RF17 | Parcial: as rotas administrativas de alteração de intervalo e refresh manual ainda não existem | [Pendências da API](api.md#endpoints-planejados) |

### Requisitos não funcionais e práticas de qualidade

| Requisito | Atendimento | Evidência |
|---|---|---|
| RNF01 | Concluído na interface entregue e na avaliação com usuários | [Interface](interface.md) e [avaliação IHC05](ihc/avaliacao-usabilidade-sprint-3.md) |
| RNF02–RNF05 | Concluído: tratamento de falhas, agendamento, PostgreSQL, Docker e integração externa | [Arquitetura](arquitetura.md), [Contrato do Agregador](contrato-agregador.md) e `compose.yaml` |
| RNF06 | Concluído: execução unificada por Docker Compose | [README principal](../../README.md) |
| RNF07 | Concluído: JWT, bcrypt, validação de DTOs e testes automatizados | [Relatório de testes](evidencias/relatorio-cobertura-sprint-3.md) |
| RNF08 | Concluído na documentação técnica e no Swagger | [API](api.md), [README de documentação](README.md) e `/api/docs` |
| RP01–RP05 | Concluído: arquitetura frontend/backend, persistência, integração externa e containerização | [Arquitetura](arquitetura.md) e estrutura do repositório |
| RP06 | Concluído na documentação, no fluxo de entrega e na demonstração final | [Guia de contribuição](processo-contribuicao.md), sprints e guia de portfólio |
| RP07 | Concluído: práticas de segurança e validação de entrada | [API](api.md) e módulo de autenticação |
| RP09 | Concluído na implementação, na avaliação de usabilidade e no registro das melhorias | [TASK-047](ihc/task-047-implementacao.md) e [IHC05](ihc/avaliacao-usabilidade-sprint-3.md) |

## 6. Testes e evidências

O relatório da TASK-050 registra 42 suítes e 338 cenários aprovados, incluindo backend, frontend, integração e E2E com PostgreSQL.

- [Relatório de testes e cobertura da Sprint 3](evidencias/relatorio-cobertura-sprint-3.md)
- [Burndown da Sprint 3](evidencias/burndown-sprint-3.png)
- [Evidências visuais](evidencias/README.md)
- [Vídeo da Sprint Review 2](https://youtu.be/1soOS-lRddQ)
- [Vídeo da Sprint Review 3](https://youtu.be/2h2wEK6j1RE)

## 7. Retrospectiva final

### O que funcionou bem

- O trabalho dividido por tasks e responsáveis facilitou a rastreabilidade.
- As dependências entre backend, frontend, testes e documentação foram explicitadas.
- Pull Requests e validações automatizadas ajudaram a reduzir regressões.
- O burndown acompanhou os 47 pontos até o encerramento.

### O que poderia melhorar

- Evidências externas, como vídeo e resultados de usabilidade, deveriam ser coletadas durante a sprint.
- A matriz de requisitos deveria ser atualizada junto de cada entrega, e não apenas no encerramento.

### Ações de fechamento

| Ação | Situação |
|---|---|
| Publicar o vídeo da Sprint Review 3 e inserir o link em `sprint-3.md` | Concluído |
| Registrar as melhorias de usabilidade associadas à TASK-047 | Concluído |
| Manter o repositório e a documentação sincronizados após a entrega | Recomendação de manutenção |

## 8. Conclusão

O GreenER possui uma base funcional integrada, documentada e validada por testes, com os principais fluxos de monitoramento ambiental disponíveis para demonstração. O projeto está encerrado documentalmente, com as limitações técnicas conhecidas registradas na documentação da API.
