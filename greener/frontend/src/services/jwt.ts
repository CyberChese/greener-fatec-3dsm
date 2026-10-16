/**
 * Dados do token que a interface mostra (e-mail, papel, expiração).
 *
 * Isto serve apenas para EXIBIR a sessão. Não valida nada: quem confia (ou não) no token
 * é o backend, que verifica a assinatura em cada rota protegida (RP07).
 */
export type JwtClaims = {
  email?: string
  role?: string
  /** Expiração, em segundos desde 1970 (campo `exp` do JWT). */
  exp?: number
}

function decodeBase64Url(segment: string): string {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export function readJwtClaims(token: string): JwtClaims {
  try {
    const payload = token.split('.')[1]
    if (!payload) return {}

    const data: unknown = JSON.parse(decodeBase64Url(payload))
    if (typeof data !== 'object' || data === null) return {}

    const record = data as Record<string, unknown>
    const claims: JwtClaims = {}
    if (typeof record.email === 'string') claims.email = record.email
    if (typeof record.role === 'string') claims.role = record.role
    if (typeof record.exp === 'number') claims.exp = record.exp
    return claims
  } catch {
    return {}
  }
}
