import { publicApi } from './http.ts'

export interface CollectionStatus {
  interval_seconds: number
  last_collection_at: string | null
}

function isCollectionStatus(value: unknown): value is CollectionStatus {
  if (typeof value !== 'object' || value === null) return false

  const status = value as Record<string, unknown>
  return (
    typeof status.interval_seconds === 'number' &&
    Number.isSafeInteger(status.interval_seconds) &&
    status.interval_seconds > 0 &&
    (status.last_collection_at === null ||
      (typeof status.last_collection_at === 'string' &&
        !Number.isNaN(Date.parse(status.last_collection_at))))
  )
}

export async function getCollectionStatus(): Promise<CollectionStatus> {
  const response = await publicApi.get<unknown>('/metrics/collection-config')
  if (!isCollectionStatus(response.data)) {
    throw new Error('A API retornou uma configuração de coleta inválida.')
  }
  return response.data
}
