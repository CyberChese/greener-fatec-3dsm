import axios from 'axios'
import { toApiError } from './apiError.ts'
import { getAccessToken, notifyUnauthorized } from './session.ts'

const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api'

const config = {
  baseURL,
  timeout: 10_000,
  headers: { Accept: 'application/json' },
}

/**
 * Chamadas abertas (dashboard público e login).
 * Nunca levam o token e nunca encerram a sessão, nem em caso de 401
 * (um 401 no login significa credencial inválida, e não sessão expirada).
 */
export const publicApi = axios.create(config)

/**
 * Chamadas que exigem autenticação (área de configuração).
 * Anexa o JWT e, ao receber 401, encerra a sessão.
 */
export const privateApi = axios.create(config)

publicApi.interceptors.response.use(undefined, (error: unknown) =>
  Promise.reject(toApiError(error)),
)

privateApi.interceptors.request.use((request) => {
  const token = getAccessToken()
  if (token) request.headers.set('Authorization', `Bearer ${token}`)
  return request
})

privateApi.interceptors.response.use(undefined, (error: unknown) => {
  const apiError = toApiError(error)
  if (apiError.kind === 'unauthorized') notifyUnauthorized()
  return Promise.reject(apiError)
})
