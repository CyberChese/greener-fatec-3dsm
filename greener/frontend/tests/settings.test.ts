import { describe, expect, it } from 'vitest'
import { validateSettings } from '@/lib/settings'

describe('validação das configurações do monitoramento (RF16)', () => {
  it('aceita um intervalo inteiro dentro do limite', () => {
    const { errors, value } = validateSettings({ intervalSeconds: '5', defaultPeriod: 'session' })
    expect(errors).toEqual({})
    expect(value).toEqual({ intervalSeconds: 5, defaultPeriod: 'session' })
  })

  it('rejeita intervalo vazio, decimal ou fora do limite', () => {
    expect(validateSettings({ intervalSeconds: '', defaultPeriod: 'last10' }).value).toBeNull()
    expect(validateSettings({ intervalSeconds: '2,5', defaultPeriod: 'last10' }).errors.intervalSeconds).toBeDefined()
    expect(validateSettings({ intervalSeconds: '0', defaultPeriod: 'last10' }).errors.intervalSeconds).toContain('entre 1 e 60')
    expect(validateSettings({ intervalSeconds: '61', defaultPeriod: 'last10' }).value).toBeNull()
  })

  it('rejeita período desconhecido', () => {
    const { errors, value } = validateSettings({ intervalSeconds: '3', defaultPeriod: 'ontem' })
    expect(errors.defaultPeriod).toBeDefined()
    expect(value).toBeNull()
  })
})
