# 🌱 GreenER — Sprint 2: Estimativas Ambientais e Dashboard

> **Situação:** 🟡 Em andamento — há entregas integradas em `dev`, como os PRs [#101](https://github.com/CyberChese/greener-fatec-3dsm/pull/101) e [#104](https://github.com/CyberChese/greener-fatec-3dsm/pull/104). Acompanhamento e responsáveis estão no [board](https://github.com/orgs/CyberChese/projects/2/views/3); não foi encontrada tag de fechamento da Sprint 2 na consulta de 04/11/2026.

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

## Processo de PR e registro da entrega

Aplicar o [processo de contribuição](../processo-contribuicao.md) e o [template de Pull Request](../../../.github/PULL_REQUEST_TEMPLATE.md) em todas as entregas: escopo pequeno, critérios de aceite e CI evidenciados, análise técnica substantiva por integrante diferente do autor e integração por PR. A evidência consultada em 04/11/2026 indica `main` e `dev` protegidas, mas os requisitos específicos da proteção não puderam ser lidos sem autenticação; consulte as [ações pendentes de permissão e registro de tag](../processo-contribuicao.md#estado-observado-no-github).

Nenhuma tag ou release da Sprint 2 foi encontrada na consulta de 04/11/2026. Criar e registrar a tag somente após a Sprint Review e o corte da release. Registrar dailies e decisões de escopo no board, com issue relacionada, conforme o [formato curto de ata](../processo-contribuicao.md#daily-e-decisoes-de-escopo).

Uma decisão de escopo existente foi consolidada em [registros curtos da Sprint 2](../atas/decisoes-sprint-2.md). Na amostra de PRs integrados, seis têm review técnico não vazio; o PR #102 tem apenas “Aprovado.” e segue como lacuna a corrigir, conforme o [registro de evidências e ações pendentes](../processo-contribuicao.md#estado-observado-no-github).

**TASK-039:** template e política estão registrados; não marcar a task como concluída enquanto o review do PR #102, a verificação de regras pelo responsável com acesso e a tag da release da Sprint 2 permanecerem pendentes. O detalhamento está na [matriz de critérios](../processo-contribuicao.md#estado-dos-criterios-da-task-039-em-04112026).

## Seções a preencher durante a sprint

- Tabela de tasks e responsáveis, com capacidade da equipe
- User Stories e critérios de aceite
- Acompanhamento e impedimentos
- Definition of Done aplicada
- Sprint Review, retrospectiva e ações de melhoria
