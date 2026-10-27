# Sprint 2 — Motor Ambiental, Dashboard e Qualidade de Entrega

**Período planejado:** 21/10/2026 a 11/11/2026 · **Status:** Em andamento  
**Backlog revisado:** 20 tasks, 82 pontos estimados (45 originais + 37 adicionados a partir do feedback do cliente). O time deve validar a capacidade e negociar escopo no planning.

## Objetivo

Completar o caminho da telemetria até ao Observatório: persistir o código regional do serviço, estimar energia e emissões com premissas documentadas, expor indicadores públicos e construir dashboard responsivo com cards, mapa e atualização automática. Fortalecer acessibilidade, testes, segurança, CI e revisão técnica por PR.

## Escopo funcional

- Motor determinístico de energia, com fórmula, unidades, fonte das premissas, duração do intervalo e exemplos reproduzíveis.
- Integração com intensidade de carbono por `region_code`, timeout e fallback configurável/auditável.
- Emissões por coleta persistidas com precisão documentada e reprocessamento idempotente.
- `GET /api/metrics/summary` público para o Observatório; rotas administrativas permanecem protegidas por JWT.
- Grid de serviços e mapa usando metadados e coordenadas existentes; não inventar localização quando estiver ausente.
- Polling sem flicker, sem requisições sobrepostas e com recuperação após falha temporária.

## Qualidade, acessibilidade e processo

- Corrigir o tratamento de HTTP 404/500 conforme o contrato oficial do Agregador.
- Validar contraste, tokens do Figma e responsividade em 390 px, tablet e desktop; registrar capturas.
- Adicionar CI para build/lint/testes, alinhar Node/engines/container e testar dentro das imagens oficiais.
- Remover segredos padrão, restringir seed a ambiente local e limitar tentativas de login.
- Usar PRs pequenos, review técnico substantivo, checks e evidências de burndown/review.

## Decisões de implementação

1. Não assumir fórmula, parâmetro físico, endpoint de carbono ou schema externo sem fonte e validação documentadas.
2. GB de tráfego/armazenamento só entram no cálculo com dimensão temporal e interpretação definidas.
3. Dashboard e resumo são públicos, conforme o fluxo de Observatório do projeto; configuração administrativa exige autenticação.
4. Revisar os índices existentes antes de propor duplicatas; justificar mudanças com consulta e plano de execução observados.
5. Critérios de aceite indicam evidência verificável. Configurações que dependam de permissão do GitHub devem registrar responsável/evidência, não alegar que já estão ativas.

## Documentos de tasks

- Tabela: [`../../../../tasks_sprint2_tabela-v2.md`](../../../../tasks_sprint2_tabela-v2.md)
- Contratos detalhados: [`../../../../descricoes_tasks_sprint2-v2.md`](../../../../descricoes_tasks_sprint2-v2.md)
- Resumo da sprint: [`../../../../sprint2README_GreenER-v2.md`](../../../../sprint2README_GreenER-v2.md)

## Fora do escopo funcional

Ranking ambiental, comparação temporal, filtros de período e exportação de relatórios seguem planejados para Sprint 3, salvo renegociação explícita.
