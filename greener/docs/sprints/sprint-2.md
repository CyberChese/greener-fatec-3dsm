# 🌱 GreenER — Sprint 2: Estimativas Ambientais e Dashboard

> **Situação:** 🟡 Planejada — a sprint ainda não começou. O Sprint Backlog detalhado (tasks, responsáveis, pontos e critérios de aceite) será registrado aqui no início da sprint.

## 🎯 Objetivo previsto

Converter as métricas coletadas em estimativas de consumo de energia (kWh) e emissões (CO₂e), usando a intensidade de carbono por região, e apresentar esses dados no dashboard operacional.

## 📦 Entregas previstas

Conforme o [plano de entregas](../plano-de-entregas.md#sprint-2--planejamento-previsto):

- Integração com o serviço de intensidade de carbono da UniLaunch (DW02).
- Cálculo de energia e CO₂e documentado em [`calculos.md`](../calculos.md) e coberto por testes unitários (TP04).
- Dashboard com serviços, estados, localização e indicadores (DW05, IHC03, IHC04).
- Rotas administrativas protegidas por JWT (DW06).
- Swagger em `/api/docs` (DW07).

## 📌 Pendências herdadas da Sprint 1

| Pendência | Critério |
|---|---|
| Executar a descoberta de serviços periodicamente | DW02 |
| Persistir o `region_code` dos serviços | DW02 |
| Atualizar a imagem do backend para Node 24 e rodar os testes no container | DW07, TP04 |
| Criar a camada de repositories e separar responsabilidades do `MetricsService` | DW03, TP01 |
| Remover código sem uso | TP03 |

## 🔁 Ações de melhoria vindas da retrospectiva da Sprint 1

Ver [Retrospectiva da Sprint 1](sprint-1.md#-retrospectiva). A aplicação de cada ação será registrada nesta seção durante a sprint.

| Ação | Como será aplicada | Situação |
|---|---|---|
| Atualizar a documentação junto com cada PR | Item do checklist da Definition of Done | A iniciar |
| Revisar critérios de aceite quando a implementação mudar | Registrar a alteração e a justificativa na própria história | A iniciar |
| Rodar os testes no mesmo ambiente documentado no README | Ajuste da imagem Docker | A iniciar |

## Seções a preencher durante a sprint

- Tabela de tasks e responsáveis, com capacidade da equipe
- User Stories e critérios de aceite
- Acompanhamento e impedimentos
- Definition of Done aplicada
- Sprint Review, retrospectiva e ações de melhoria
