import axios from 'axios'

/**
 * Tipos de falha ao falar com a API:
 * - network: sem resposta (backend fora do ar, CORS, rede);
 * - timeout: a API demorou além do limite;
 * - unauthorized: 401 (credencial inválida ou sessão expirada);
 * - client: outros 4xx (ex.: dados inválidos);
 * - server: 5xx.
 */
export type ApiErrorKind = 'network' | 'timeout' | 'unauthorized' | 'client' | 'server'

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status?: number

  constructor(kind: ApiErrorKind, message: string, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    this.status = status
  }
}

// O NestJS devolve `message` como texto ou como lista (erros de validação dos DTOs).
function readServerMessage(data: unknown): string | undefined {
  if (typeof data !== 'object' || data === null || !('message' in data)) return undefined
  const message = data.message
  if (typeof message === 'string') return message
  if (Array.isArray(message) && message.every((item) => typeof item === 'string')) {
    return message.join(' ')
  }
  return undefined
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error

  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new ApiError('timeout', 'A API demorou demais para responder.')
    }
    if (!error.response) {
      return new ApiError('network', 'Não foi possível conectar à API.')
    }

    const { status, data } = error.response
    const serverMessage = readServerMessage(data)

    if (status === 401) {
      return new ApiError('unauthorized', serverMessage ?? 'Credenciais inválidas ou sessão expirada.', status)
    }
    if (status >= 500) {
      return new ApiError('server', serverMessage ?? 'A API encontrou um erro interno.', status)
    }
    return new ApiError('client', serverMessage ?? 'A requisição não pôde ser concluída.', status)
  }

  return new ApiError('network', 'Erro inesperado ao falar com a API.')
}
