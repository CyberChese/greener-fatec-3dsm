// Estado da sessão fora do React, para o interceptor do Axios conseguir ler o token
// e avisar a aplicação quando a sessão cair (interceptors não são hooks).
//
// Por enquanto o token fica apenas em memória: recarregar a página encerra a sessão.
// A decisão definitiva de armazenamento será registrada na TASK-012.

type UnauthorizedHandler = () => void

let accessToken: string | null = null
let unauthorizedHandler: UnauthorizedHandler | null = null

export function getAccessToken(): string | null {
  return accessToken
}

export function setAccessToken(token: string | null): void {
  accessToken = token
}

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler
}

export function notifyUnauthorized(): void {
  unauthorizedHandler?.()
}
