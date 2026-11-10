# Registros curtos de decisões — Sprint 2

Este arquivo registra decisões de escopo já documentadas no fluxo de entrega. Não é uma ata de daily e não atribui presença a pessoas que não participaram.

## 03/11/2026 — Período de referência de energia e CO₂e

- **Fonte:** [PR #104](https://github.com/CyberChese/greener-fatec-3dsm/pull/104), descrição e decisão acordada com o PO.
- **Participantes explicitamente citados na decisão:** Luka Gomes (autor da proposta) e Lucas Cobra (PO).
- **Decisão:** exibir energia e CO₂e por serviço como a soma das coletas dos últimos 15 minutos; usar a intensidade de carbono da coleta mais recente.
- **Motivo:** uma coleta a cada 30 segundos representa aproximadamente `0,0004 kWh`; somar o período de 15 minutos torna o indicador mais útil. O rótulo do período ficou para o PR seguinte, mantendo o escopo do PR #104 limitado à camada de dados.
- **Registro da aprovação:** a descrição do PR informa aprovação do PO. O PR foi integrado em `dev` em 04/11/2026 às 01:14 UTC.

## Como registrar novas dailies e decisões

Para uma daily, use a pauta breve em [Processo de contribuição e entrega](../processo-contribuicao.md#daily-e-decisões-de-escopo). Para decisões de escopo, acrescente data, decisão, motivo, participantes somente quando conhecidos e link da issue/PR. Atualize também os critérios de aceite da task quando a decisão os alterar. Não crie registros retroativos.
