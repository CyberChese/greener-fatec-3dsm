import { ApiError } from './apiError.ts'
import { publicApi } from './http.ts'

export type LoginCredentials = {
  email: string
  password: string
}

// Contrato esperado do backend (TASKs 010 e 011):
//   POST /auth/login  { email, password }  ->  200 { accessToken }  |  401 { message }
// Se o backend usar outro caminho ou outro nome de campo, ajuste somente este arquivo.
const LOGIN_PATH = '/auth/login'

function readAccessToken(data: unknown): string | null {
  if (typeof data !== 'object' || data === null) return null
  const record = data as Record<string, unknown>
  const token = record.accessToken ?? record.access_token
  return typeof token === 'string' && token.length > 0 ? token : null
}

/**
 * Pede o token ao backend. Usa a instância PÚBLICA do Axios de propósito:
 * um 401 aqui significa credencial inválida, e não sessão expirada.
 */
export async function requestLogin(credentials: LoginCredentials): Promise<string> {
  const { data } = await publicApi.post<unknown>(LOGIN_PATH, credentials)
  const token = readAccessToken(data)
  if (!token) {
    throw new ApiError('server', 'O servidor devolveu uma resposta de login inesperada.')
  }
  return token
}
