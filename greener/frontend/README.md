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

## Variáveis de ambiente

| Variável | Para que serve | Valor padrão |
|---|---|---|
| `VITE_API_URL` | Endereço do backend, acessado pelo **navegador** | `http://localhost:3001` |

O Vite só expõe ao código as variáveis que começam com `VITE_`. O endereço deve ser o que o navegador
enxerga (`localhost`), e não o nome do container. No Docker, o valor vem do `compose.yaml`, que lê o `.env`
da raiz do repositório (veja o `.env.example`).

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
├── components/   # Peças reutilizáveis (AppLayout, ProtectedRoute, StatusBadge...)
├── pages/        # Telas completas, uma por rota (HomePage, ComparePage, LoginPage...)
├── services/     # Comunicação com o backend (http.ts, apiError.ts, session.ts)
├── hooks/        # Hooks reutilizáveis (useAuth; depois usePolling, useServices...)
├── contexts/     # Contexts do React (AuthContext)
├── providers/    # AppProviders: roteador + todos os contexts num único ponto
├── types/        # Tipos TypeScript compartilhados (ex.: ServiceState)
├── styles/       # CSS global e tokens de tema (index.css)
├── App.tsx       # Definição das rotas
└── main.tsx      # Ponto de entrada
```

Convenções:

- Componentes e páginas em `PascalCase.tsx`; hooks em `useAlgo.ts`; serviços e tipos em `camelCase.ts`.
- Uma página só compõe componentes e chama hooks; a comunicação com a API fica em `services/`.
- Estado compartilhado entre telas fica em `contexts/` e é registrado em `providers/AppProviders.tsx`.
- Evite `any`. Tipos dos dados da API ficam em `types/`.

## Rotas

| Rota | Acesso | Tela |
|---|---|---|
| `/` | Pública | Visão geral |
| `/comparar` | Pública | Comparação de serviços |
| `/login` | Pública | Entrar (formulário real na TASK-012) |
| `/config` | **Protegida** | Configuração do monitoramento |
| qualquer outra | Pública | Página não encontrada |

A consulta ao dashboard é pública. A rota protegida (`ProtectedRoute`) só controla a **navegação na
interface**: quem barra de verdade é o backend, que valida o JWT em cada rota protegida.

## Chamadas HTTP (Axios)

`src/services/http.ts` exporta duas instâncias, ambas com `VITE_API_URL` e timeout de 10 s:

| Instância | Uso | Token | Em caso de 401 |
|---|---|---|---|
| `publicApi` | Dashboard público e login | **Nunca** é enviado | Não encerra a sessão |
| `privateApi` | Área de configuração | Envia `Authorization: Bearer <token>` | Encerra a sessão e leva ao login |

Regras:

- Chamadas do dashboard público usam **sempre** `publicApi`. Assim, um token vencido nunca quebra a consulta pública.
- O login usa `publicApi`: um 401 ali significa credencial inválida, e não sessão expirada.
- Toda falha vira um `ApiError` (`src/services/apiError.ts`) com `kind`: `network` (sem resposta), `timeout`,
  `unauthorized` (401), `client` (outros 4xx) ou `server` (5xx). A interface escolhe a mensagem pelo `kind`.

### Sessão

O token fica apenas em memória (`src/services/session.ts`): recarregar a página encerra a sessão.
O `AuthProvider` expõe `isAuthenticated`, `sessionExpired`, `login` e `logout` pelo hook `useAuth()`.
A decisão definitiva de armazenamento do token será registrada na TASK-012.

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

- Tela de login e estado de autenticação completos: TASK-012 (o botão "Simular login" aparece só em
  desenvolvimento e será removido).
- Testes automatizados do interceptor e das rotas: quando houver um executor de testes no frontend.
