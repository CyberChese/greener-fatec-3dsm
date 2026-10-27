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
| `VITE_API_URL` | Endereço do backend, acessado pelo **navegador** | `http://localhost:3001/api` |

O Vite só expõe ao código as variáveis que começam com `VITE_`, e **tudo o que começa com `VITE_` fica
visível no navegador**. Nunca coloque senha, chave ou segredo em variável `VITE_`.
O endereço deve ser o que o navegador enxerga (`localhost`), e não o nome do container. No Docker, o valor
vem do `compose.yaml`, que lê o `.env` da raiz do repositório (veja o `.env.example`).

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
├── components/   # Peças reutilizáveis (AppLayout, LoginModal, SessionCard, StatusBadge...)
├── pages/        # Telas completas, uma por rota (HomePage, AdminPage, ComparePage...)
├── services/     # Comunicação com o backend (http, apiError, session, authApi, jwt)
├── hooks/        # Hooks reutilizáveis (useAuth, useLogout, useLoginRedirect...)
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
| `/` | Pública | Observatório |
| `/comparar` | Pública | Comparação de serviços (ainda sem link no menu) |
| `/login` | Pública | **Modal** de login, aberto sobre o Observatório |
| `/admin` | **Protegida** | Área do Administrador |
| qualquer outra | Pública | Página não encontrada |

A consulta ao dashboard é pública. A rota protegida (`ProtectedRoute`) só controla a **navegação na
interface**: quem barra de verdade é o backend, que valida o JWT em cada rota protegida.

Abrir `/admin` sem sessão leva a `/login`; depois do login a pessoa volta para a tela que tentou abrir.

## Chamadas HTTP (Axios)

`src/services/http.ts` exporta duas instâncias, ambas com `VITE_API_URL` e timeout de 10 s:

| Instância | Uso | Token | Em caso de 401 |
|---|---|---|---|
| `publicApi` | Dashboard público e login | **Nunca** é enviado | Não encerra a sessão |
| `privateApi` | Área do administrador | Envia `Authorization: Bearer <token>` | Encerra a sessão e leva ao login |

Regras:

- Chamadas do dashboard público usam **sempre** `publicApi`. Assim, um token vencido nunca quebra a consulta pública.
- O login usa `publicApi`: um 401 ali significa credencial inválida, e não sessão expirada.
- Toda falha vira um `ApiError` (`src/services/apiError.ts`) com `kind`: `network` (sem resposta), `timeout`,
  `unauthorized` (401), `client` (outros 4xx) ou `server` (5xx). A interface escolhe a mensagem pelo `kind`.

## Autenticação

Contrato esperado do backend (`src/services/authApi.ts`, o único arquivo a ajustar se ele mudar):

```
POST /auth/login   { "email": "...", "password": "..." }
  200  { "accessToken": "<jwt>" }     (também aceita "access_token")
  401  { "message": "..." }
```

Como funciona:

- O login é um **modal** (`<dialog>` nativo: foco preso, Esc fecha, fundo inerte), com validação dos campos,
  indicador de envio e mensagens por tipo de falha: credencial inválida ("E-mail ou senha incorretos.",
  genérica de propósito) é diferente de servidor fora do ar ("Serviço indisponível...").
- O token fica **só em memória** (`src/services/session.ts`): recarregar a página encerra a sessão.
  Não é guardado em `localStorage` nem em `sessionStorage`.
- A Área do Administrador mostra e-mail, papel e expiração **lidos do token apenas para exibição**
  (`src/services/jwt.ts`). O token em si nunca aparece na tela, e a validade real é decidida pelo backend.
- A sessão termina por: **Sair**, resposta 401 de uma chamada protegida, ou vencimento do token.
  Nos dois últimos casos, o modal avisa "Sua sessão expirou".
- **Sair** volta ao Observatório e só então encerra a sessão (`useLogout`).

O hook `useAuth()` expõe `isAuthenticated`, `session`, `sessionExpired`, `login` e `logout`.

## Tema (Tailwind)

Os tokens ficam em `src/styles/index.css`, dentro de `@theme`. Cada `--color-*` vira utilitário
(por exemplo `--color-brand` gera `text-brand`, `bg-brand` e `border-brand`).
Os valores foram **estimados a partir dos esboços do Figma** e devem ser conferidos com o design system.

| Token | Uso |
|---|---|
| `canvas`, `surface`, `surface-2`, `line` | Fundo, cartões e bordas |
| `ink`, `ink-muted`, `ink-subtle` | Texto principal, secundário e de apoio (placeholders) |
| `brand`, `on-brand` | Verde-limão da marca e a cor do texto sobre ele |
| `state-ok`, `state-warn`, `state-down`, `state-removed` | Estados dos serviços |

## Acessibilidade da informação (RNF02)

Os estados dos serviços **nunca dependem só da cor**. O `StatusBadge` combina cor, forma e texto:
círculo (Ativo), losango (Sem métricas), triângulo (Indisponível) e quadrado (Removido).
Erros de formulário aparecem como texto (e o campo recebe `aria-invalid`), e o aviso do login usa `role="alert"`.
Mantenha esse padrão em novos componentes (mapa, tabelas, alertas).

## O que ainda vem

- Parâmetros de coleta (RF16) e histórico de coletas (RF10) na Área do Administrador: dependem das rotas
  protegidas do backend.
- A barra de status do topo (agregador operacional, última atualização, intervalo, pausar) e o Observatório completo.
- Testes automatizados do frontend, quando houver um executor de testes configurado.

## Observatório e origem dos dados

A tela inicial (`/`) é o painel público do Observatório: indicadores, filtros, mapa-múndi, evolução, ranking, serviços
(cartões ou tabela), comparação e eventos. A Área do Administrador (`/admin`, protegida) tem a sessão, a configuração do
monitoramento (RF16) e o histórico de coletas com exportação em CSV (RF10).

Origem dos dados, escolhida por `VITE_DATA_SOURCE`:

| Valor | O que mostra |
|---|---|
| `api` (padrão) | Serviços, estados e localização **reais**, lidos de `GET /api/services`. Energia, CO₂e, intensidade, gráfico de evolução e ranking aparecem como "—" ou como aviso, porque o backend ainda não calcula nem expõe esses valores. |
| `simulated` | Simulação no navegador (demonstração), com coleta acelerada: cada coleta equivale a 15 min simulados. |

O login é sempre o real (`POST /api/auth/login`). O que o backend precisa expor para o painel mostrar tudo com dados reais
está em `greener/docs/frontend-dados-simulados.md`.

```
src/lib/         regras puras: cálculos, formatação, CSV, validação de configurações, tipos, origem dos dados
src/services/    backend-services.ts (backend real), simulação (metrics-aggregator, carbon-intensity, collector), http.ts, authApi.ts
src/hooks/       use-metrics (coleta periódica), useAuth, useSettings, useMetricsContext
src/components/  dashboard/ (painel) e admin/ (configuração e histórico)
tests/           testes unitários (npm test)
```

Scripts: `npm run lint`, `npm run build`, `npm test`.
