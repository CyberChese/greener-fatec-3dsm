/** Contraste WCAG 2.x entre duas cores hexadecimais (#rrggbb). */
function channel(value: number): number {
  const c = value / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function luminance(hex: string): number {
  const h = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => channel(parseInt(h.slice(i, i + 2), 16)))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** Mínimos da WCAG 2.2 adotados pelo projeto (TASK-035). */
export const MIN_TEXT_CONTRAST = 4.5
export const MIN_CONTROL_CONTRAST = 3
