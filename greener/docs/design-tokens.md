# Tokens de design e contraste (TASK-035)

Fonte única dos tokens: [`frontend/src/styles/index.css`](../frontend/src/styles/index.css), bloco `@theme`.
Cada `--color-*` vira utilitário do Tailwind (`--color-edge` → `border-edge`, `text-edge`…).
O contraste é verificado automaticamente em [`frontend/tests/contrast.test.ts`](../frontend/tests/contrast.test.ts)
(`npm test`): se alguém alterar um token e ele deixar de cumprir o mínimo, o teste falha.

## Situação da correspondência com o Figma

Os valores abaixo foram **estimados a partir dos esboços do Figma** na Sprint 1 (o README do frontend já registrava isso).
Os tokens finais do Figma ainda **não** foram conferidos token a token. Decisão registrada, enquanto isso:

1. Estes valores são a referência do código; qualquer divergência entre eles e o Figma final será resolvida **trocando o
   valor em `index.css`**, sem mexer nos componentes (eles usam o nome do token).
2. Divergências já conhecidas e **intencionais** (justificadas por acessibilidade, ver "Mudanças da TASK-035"):
   `edge` (não existe no Figma estimado) e a troca de textos secundários de `zinc-500` para `ink-subtle`.
3. Quem tiver acesso ao Figma preenche a coluna "Figma (final)" e, se o valor diferir, registra aqui a decisão
   (seguir o Figma ou manter o valor por contraste).

## Tokens

| Token | Valor | Uso | Contraste sobre canvas / surface / surface-2 | Figma (final) |
|---|---|---|---|---|
| `canvas` | `#0a0a0a` | fundo da página | — | a conferir |
| `surface` | `#141414` | cartões, modal | — | a conferir |
| `surface-2` | `#1c1c1c` | superfícies elevadas | — | a conferir |
| `line` | `#2a2a2a` | divisórias e bordas **decorativas** | 1,38 / 1,28 / 1,19 (não serve para controle) | a conferir |
| `edge` | `#6b6b73` | **borda de controles** (campos, seletores, botões) | 3,75 / 3,49 / 3,23 (mín. 3:1) | **divergência intencional** |
| `ink` | `#f5f5f5` | texto principal | 18,16 / 16,90 / 15,63 | a conferir |
| `ink-muted` | `#a3a3a3` | texto secundário | 7,85 / 7,30 / 6,76 | a conferir |
| `ink-subtle` | `#8a8a8a` | texto terciário, legendas, placeholders | 5,73 / 5,34 / 4,94 (mín. 4,5:1) | a conferir |
| `brand` | `#a3e635` | marca, ação principal, foco | 13,13 / 12,22 / 11,30 | a conferir |
| `on-brand` | `#0a0a0a` | texto sobre `brand` | 13,13 (sobre `brand`) | a conferir |
| `state-ok` | `#4ade80` | serviço **Ativo e Monitorado** | 11,36 / 10,57 / 9,78 | a conferir |
| `state-warn` | `#fbbf24` | serviço **Sem Métricas** | 11,86 / 11,04 / 10,21 | a conferir |
| `state-down` | `#f87171` | serviço **Serviço Indisponível**, erros | 7,16 / 6,66 / 6,16 | a conferir |
| `state-removed` | `#94a3b8` | serviço removido | 7,72 / 7,18 / 6,65 | a conferir |

Os estados nunca aparecem só pela cor: sempre há ícone e texto (RNF02).

## Regras adotadas

- **Texto** (inclui placeholders e legendas): mínimo **4,5:1**. Não usar `text-zinc-500` nem `text-zinc-600`; use `text-ink-subtle`.
- **Controles e limites visuais necessários para identificá-los** (borda de campo, seletor, botão, grupo de botões): mínimo
  **3:1**, usando `border-edge` (ou `ring-edge`). `border-line` e `border-white/10` ficam só para divisórias e cartões
  decorativos (o cartão em si não precisa de borda para ser identificado).
- **Foco por teclado**: contorno de 2 px com `brand` (`:focus-visible` em `index.css`).
- **Toque**: itens do menu móvel e botão do menu têm pelo menos 44 px de altura.

## Mudanças da TASK-035

| Antes | Depois | Motivo |
|---|---|---|
| Borda de campos e botões `white/10` (≈ 1,25:1) ou `line` (1,38:1) | `border-edge` (≥ 3,2:1) | relatório de IHC (F1) e avaliação da Sprint 1: controles abaixo de 3:1 |
| `text-zinc-500` (≈ 4,1:1) e `placeholder:text-zinc-600` (≈ 2,6:1) | `text-ink-subtle` (≥ 4,9:1) | texto abaixo de 4,5:1 |
| Estados em `emerald`/`rose` | tokens `state-ok`/`state-down` (e `state-warn`) | usar os tokens do projeto |
| Cabeçalho em linha única que quebrava em telas estreitas | menu em disclosure (botão com `aria-expanded`) abaixo de 1280 px | critério de navegação móvel por teclado |

## Utilitários Tailwind ainda usados nas telas do observatório

As telas do observatório (portadas do protótipo) usam a paleta padrão do Tailwind em vez dos tokens. A equivalência
aproximada é abaixo; migrar para tokens é uma melhoria futura, sem impacto visual relevante.

| Utilitário | Valor | Token mais próximo | Diferença |
|---|---|---|---|
| `zinc-950` | `#09090b` | `canvas` `#0a0a0a` | 1/255 por canal |
| `zinc-900/40` (cartão sobre a página) | ≈ `#0f0f11` | `surface` `#141414` | cartão um pouco mais escuro (decisão: manter) |
| `lime-400` | `#a3e635` | `brand` | idêntico |
| `zinc-100` | `#f4f4f5` | `ink` `#f5f5f5` | 1/255 |
| `zinc-400` | `#a1a1aa` | `ink-muted` `#a3a3a3` | 2/255 (7,76:1 sobre a página) |
| `amber-400` | `#fbbf24` | `state-warn` | idêntico |
