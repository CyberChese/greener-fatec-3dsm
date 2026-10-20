import type { ComponentProps } from 'react'

type FormFieldProps = Omit<ComponentProps<'input'>, 'id'> & {
  id: string
  label: string
  /** Mensagem de erro do campo. Aparece como texto, e não só como cor (RNF02). */
  error?: string
}

export function FormField({ id, label, error, className, ...inputProps }: FormFieldProps) {
  const errorId = `${id}-error`

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm text-ink-muted">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`h-13 rounded-xl border bg-canvas px-4 text-ink placeholder:text-ink-subtle ${
          error ? 'border-state-down' : 'border-line'
        } ${className ?? ''}`}
        {...inputProps}
      />
      {error && (
        <p id={errorId} className="text-sm text-state-down">
          {error}
        </p>
      )}
    </div>
  )
}
