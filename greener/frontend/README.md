# GreenER — Frontend

Aplicação web do GreenER, construída com **React + TypeScript**, **Vite** e **Tailwind CSS**.
Ela consome apenas o backend NestJS do projeto; nunca chama diretamente as APIs da UniLaunch.

## Como rodar

O jeito oficial é pelo Docker, na raiz do repositório:

```bash
docker compose up --build
```

O frontend fica em <http://localhost:3000> (porta 3000 do computador, 5173 dentro do container).

> Ao instalar um pacote novo (`npm install <pacote>`), o `node_modules` do container pode ficar
> desatualizado. Suba novamente com `docker compose up --build -V` (o `-V` renova os volumes).

Sem Docker (apenas para desenvolvimento local):

```bash
cd greener/frontend
npm install
npm run dev
```

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento com hot reload |
| `npm run build` | Checa os tipos (`tsc -b`) e gera a versão de produção |
| `npm run lint` | Executa o ESLint |
| `npm run preview` | Serve a versão de produção localmente |

Para checar só os tipos use `npx tsc -p tsconfig.app.json --noEmit`.
O `tsconfig.json` da raiz apenas referencia os demais, então `npx tsc --noEmit` sozinho não verifica nada.

## Estrutura de pastas

```
src/
├── components/   # Peças reutilizáveis de interface (StatusBadge, cartões, tabelas...)
├── pages/        # Telas completas, uma por rota (HomePage, Login, Configuração...)
├── services/     # Comunicação com o backend (cliente Axios e funções de API)
├── hooks/        # Hooks reutilizáveis (ex.: usePolling, useServices)
├── contexts/     # Contexts do React (autenticação, serviço/região/período selecionado)
├── providers/    # AppProviders: junta todos os contexts num único ponto
├── types/        # Tipos TypeScript compartilhados (ex.: ServiceState)
├── styles/       # CSS global e tokens de tema (index.css)
├── App.tsx       # Composição das páginas e rotas
└── main.tsx      # Ponto de entrada
```

Convenções:

- Componentes e páginas em `PascalCase.tsx`; hooks em `useAlgo.ts`; serviços e tipos em `camelCase.ts`.
- Uma página só compõe componentes e chama hooks; a comunicação com a API fica em `services/`.
- Estado compartilhado entre telas fica em `contexts/` e é registrado em `providers/AppProviders.tsx`.
- Evite `any`. Tipos dos dados da API ficam em `types/`.

## Tema (Tailwind)

Os tokens ficam em `src/styles/index.css`, dentro de `@theme`. Cada `--color-*` vira utilitário
(por exemplo `--color-brand` gera `text-brand`, `bg-brand` e `border-brand`).
Os valores atuais são provisórios e devem ser alinhados ao protótipo do Figma.

| Token | Uso |
|---|---|
| `canvas`, `surface`, `surface-2`, `line` | Fundo, cartões e bordas |
| `ink`, `ink-muted` | Texto principal e secundário |
| `brand`, `cta`, `on-cta` | Marca e botão de ação (`on-cta` é a cor do texto sobre `cta`) |
| `state-ok`, `state-warn`, `state-down`, `state-removed` | Estados dos serviços |

## Acessibilidade da informação (RNF02)

Os estados dos serviços **nunca dependem só da cor**. O `StatusBadge` combina cor, forma e texto:
círculo (Ativo), losango (Sem métricas), triângulo (Indisponível) e quadrado (Removido).
Mantenha esse padrão em novos componentes (mapa, tabelas, alertas).

## O que ainda vem

- Rotas (React Router) e cliente Axios com `VITE_API_URL`: TASK-009.
- Tela de login e estado de autenticação: TASK-012.
