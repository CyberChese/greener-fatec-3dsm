# Processo de contribuição e entrega

Este processo complementa a [Definition of Done da Sprint 1](sprints/sprint-1.md#-definition-of-done-dod) e vale para as entregas da Sprint 2. O template de PR está em [`.github/PULL_REQUEST_TEMPLATE.md`](../../.github/PULL_REQUEST_TEMPLATE.md).

## Fluxo de branches e PRs

1. Parta da branch de integração `dev` e trabalhe em uma branch curta por task ou objetivo, com nome que identifique o tipo e a task, por exemplo `feat/TASK-123-resumo`.
2. Faça commits somente na branch de trabalho. Integre em `dev` por Pull Request; promova `dev` para `main` por outro PR de release. Não faça commits nem push direto nas branches protegidas.
3. Mantenha cada PR pequeno e coeso. Separe mudanças independentes e atualize a documentação ligada ao comportamento alterado.
4. Preencha o template com contexto, solução, critérios de aceite, comandos/resultados, links de CI, riscos e impactos.
5. Antes do merge, outro integrante deve revisar o código e os critérios de aceite. A aprovação precisa conter evidência de análise técnica — pontos conferidos, conclusão e ressalvas — e não apenas “aprovado”. O autor não aprova o próprio PR. Corrija ou responda aos apontamentos antes do merge.
6. Preserve os resultados da CI associados ao PR. A CI automatizada não substitui a revisão técnica.

## Estado observado no GitHub

Consulta realizada em 04/11/2026. A marca `protected` informa que a branch está protegida, mas não permite concluir quais requisitos específicos estão ativos.

| Item | Evidência observada | O que fica registrado |
|---|---|---|
| `main` e `dev` | A [listagem de branches](https://github.com/CyberChese/greener-fatec-3dsm/branches) indica `protected: true` para ambas. | Não afirmar que há aprovação obrigatória, checks obrigatórios, número mínimo de revisores ou bloqueio de *force push*: a leitura da configuração detalhada requer autenticação e retornou HTTP 401. |
| CI | [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) executa lint, build e testes em PRs para `dev` e `main`, e em push para `dev`. | O workflow existe; não afirmar que seus checks são exigidos como regra de proteção sem confirmação nas configurações do GitHub. |
| Tags e releases | A [listagem de tags](https://github.com/CyberChese/greener-fatec-3dsm/tags), a listagem de releases e `git ls-remote --tags origin` não retornaram itens. | Nenhuma tag de entrega da Sprint 2 foi encontrada em 04/11/2026. Não criar uma tag de fechamento antes da aprovação da Sprint Review e do corte da release. |
| PRs recentes | [#94](https://github.com/CyberChese/greener-fatec-3dsm/pull/94), [#97](https://github.com/CyberChese/greener-fatec-3dsm/pull/97), [#98](https://github.com/CyberChese/greener-fatec-3dsm/pull/98), [#100](https://github.com/CyberChese/greener-fatec-3dsm/pull/100), [#101](https://github.com/CyberChese/greener-fatec-3dsm/pull/101) e [#104](https://github.com/CyberChese/greener-fatec-3dsm/pull/104) têm reviews aprovados por integrantes diferentes dos autores, com análise técnica não vazia. | Evidência positiva de adoção em seis PRs. A inspeção também encontrou uma exceção: o PR #102 recebeu apenas “Aprovado.”, sem justificativa técnica; registrar e corrigir essa lacuna antes de considerar o critério universal atendido. |
| CI em PRs | Os check runs de backend e frontend dos PRs [#101](https://github.com/CyberChese/greener-fatec-3dsm/actions/runs/41723954413) e [#104](https://github.com/CyberChese/greener-fatec-3dsm/actions/runs/41752371850) terminaram com conclusão `success`. | Exemplos de evidência de CI aprovada; não foi confirmado que esses checks são obrigatórios nas regras de proteção. |

### Ações que dependem de permissão

- A issue [TASK-039](https://github.com/CyberChese/greener-fatec-3dsm/issues/89) permanece atribuída no board a `@Gustavo-Zago`. O responsável deve confirmar que possui acesso para consultar as regras e, se necessário, configurar a proteção de `main` e `dev` (PR obrigatório, aprovação de outro integrante e checks de CI pertinentes), e registrar na issue o resultado real ou a impossibilidade/permissão necessária. Até essa confirmação, os requisitos específicos estão **não verificados**, não presumidos.
- A criação da tag de entrega da Sprint 2 fica para o responsável pela release depois da Sprint Review. Registrar no board o nome da tag, commit associado e link da release após a criação; até lá, a tag consta como pendente, não como habilitada/configurada.
- O PR [#102](https://github.com/CyberChese/greener-fatec-3dsm/pull/102) foi integrado com uma aprovação cujo texto é apenas “Aprovado.”. O revisor/PO deve acrescentar, se ainda for possível, um comentário técnico de acompanhamento à issue/PR ou ao board, sem reescrever a aprovação original. A regra para PRs futuros passa a exigir review substantivo antes do merge.

### Estado dos critérios da TASK-039 em 04/11/2026

| Critério | Estado | Evidência / próximo passo |
|---|---|---|
| Template com contexto, solução, critérios, CI e riscos | Atendido | [Template versionado](../../.github/PULL_REQUEST_TEMPLATE.md). |
| Reviews técnicos por outro integrante | Parcial | Seis PRs recentes têm review não vazio; o PR #102 tem apenas “Aprovado.”. Solicitar o complemento ao responsável/revisor no board antes de declarar o critério universal atendido. |
| Política e evidências de branch protection/tag | Parcial, depende de permissão e do fechamento da Sprint 2 | `main` e `dev` aparecem protegidas; regras detalhadas não estão verificadas. A issue #89 está atribuída a `@Gustavo-Zago`, mas o acesso do responsável às configurações ainda precisa ser confirmado e o resultado registrado no board. Não foi encontrada tag da Sprint 2; criá-la após a Sprint Review e documentar o commit/release. |
| Daily ou decisões de escopo registradas | Parcialmente atendido | A decisão real do PR #104 foi registrada em [ata curta de decisão](atas/decisoes-sprint-2.md). Nenhuma ata de daily foi encontrada ou criada retroativamente. |

## Daily e decisões de escopo

Registre o acompanhamento no [board GitHub Projects](https://github.com/orgs/CyberChese/projects/2/views/3): atualizar status, responsável e impedimentos das tasks; registrar decisões de escopo em comentário na issue relacionada. Se a conversa ocorrer em daily, uma ata curta pode seguir este formato:

```text
Data:
Participantes:
Concluído desde a última daily:
Próximos passos:
Impedimentos:
Decisões de escopo (decisão, motivo e issue afetada):
```

Uma decisão deve apontar para a issue/PR afetada e ser refletida nos critérios de aceite quando os alterar. Não registrar atas retroativas nem decisões que não ocorreram.

## Registro de execução

O registro da escolha dos últimos 15 minutos, com motivo e acordo com o PO, foi consolidado em [decisoes-sprint-2.md](atas/decisoes-sprint-2.md). Não foi localizada ata de daily nesta verificação; não se inventou uma ata retroativa.
