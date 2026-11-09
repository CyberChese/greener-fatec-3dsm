/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { contrastRatio, MIN_CONTROL_CONTRAST, MIN_TEXT_CONTRAST } from '@/lib/contrast'

/** Código-fonte de todas as telas e componentes, lido como texto. */
const sources = import.meta.glob<string>('/src/**/*.tsx', { query: '?raw', import: 'default', eager: true })
const css = readFileSync(new URL('../src/styles/index.css', import.meta.url), 'utf8')

/** Lê os tokens --color-* declarados em src/styles/index.css. */
const token = (name: string): string => {
  const match = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`))
  if (!match) throw new Error(`token --color-${name} não encontrado`)
  return match[1]
}

const backgrounds = ['canvas', 'surface', 'surface-2'] as const

describe('contraste dos tokens (TASK-035)', () => {
  it.each(['ink', 'ink-muted', 'ink-subtle', 'brand', 'state-ok', 'state-warn', 'state-down'])(
    'texto "%s" tem pelo menos 4,5:1 sobre canvas, surface e surface-2',
    (name) => {
      for (const bg of backgrounds) {
        expect(contrastRatio(token(name), token(bg))).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST)
      }
    },
  )

  it('texto sobre o botão de marca (on-brand sobre brand) tem pelo menos 4,5:1', () => {
    expect(contrastRatio(token('on-brand'), token('brand'))).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST)
  })

  it('a borda de controles (edge) tem pelo menos 3:1 sobre canvas, surface e surface-2', () => {
    for (const bg of backgrounds) {
      expect(contrastRatio(token('edge'), token(bg))).toBeGreaterThanOrEqual(MIN_CONTROL_CONTRAST)
    }
  })

  it('a cor de marca e as cores de estado identificam componentes com pelo menos 3:1', () => {
    for (const name of ['brand', 'state-ok', 'state-warn', 'state-down']) {
      expect(contrastRatio(token(name), token('canvas'))).toBeGreaterThanOrEqual(MIN_CONTROL_CONTRAST)
    }
  })

  it('registra que "line" (#2a2a2a) é só decorativa e NÃO serve de borda de controle', () => {
    expect(contrastRatio(token('line'), token('canvas'))).toBeLessThan(MIN_CONTROL_CONTRAST)
  })

  it('os cinzas de texto do Tailwind usados nas telas passam de 4,5:1 sobre o fundo escuro', () => {
    const page = '#09090b'
    for (const hex of ['#a1a1aa', '#d4d4d8', '#e4e4e7', '#f4f4f5']) {
      expect(contrastRatio(hex, page)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST)
    }
  })
})

describe('regressões de contraste no código', () => {
  const files = Object.entries(sources)

  it('nenhum texto usa text-zinc-500/600 (abaixo de 4,5:1); use text-ink-subtle', () => {
    const offenders = files.filter(([, code]) => /text-zinc-[56]00/.test(code)).map(([path]) => path)
    expect(offenders).toEqual([])
  })

  it('campos, botões e seletores não usam borda decorativa (border-white/10 ou border-line)', () => {
    const offenders = files.flatMap(([path, code]) =>
      code
        .split('\n')
        .filter((line) => /<input|<select|<button|const selectClass|const inputClass/.test(line) && /border-white\/10|border-line\b/.test(line))
        .map((line) => `${path}: ${line.trim().slice(0, 80)}`),
    )
    expect(offenders).toEqual([])
  })
})
