import { Eye, EyeOff } from 'lucide-react'
import { useState, type ComponentProps } from 'react'

type FormFieldProps = Omit<ComponentProps<'input'>, 'id'> & {
  id: string
  label: string
  /** Mensagem de erro do campo. Aparece como texto, e não só como cor (RNF02). */
  error?: string
}

export function FormField({ id, label, error, className, ...inputProps }: FormFieldProps) {
  const [passwordVisible, setPasswordVisible] = useState(false)
  const errorId = `${id}-error`
  const isPassword = inputProps.type === 'password'

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm text-ink-muted">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`h-13 w-full rounded-xl border bg-canvas px-4 text-ink placeholder:text-ink-subtle ${
            isPassword ? 'pr-14' : ''
          } ${error ? 'border-state-down' : 'border-edge'} ${className ?? ''}`}
          {...inputProps}
          type={isPassword && passwordVisible ? 'text' : inputProps.type}
        />
        {isPassword ? (
          <button
            type="button"
            aria-label={passwordVisible ? 'Ocultar senha' : 'Mostrar senha'}
            aria-controls={id}
            aria-pressed={passwordVisible}
            title={passwordVisible ? 'Ocultar senha' : 'Mostrar senha'}
            onClick={() => setPasswordVisible((visible) => !visible)}
            className="absolute inset-y-0 right-1 grid w-11 place-items-center rounded-lg text-ink-muted hover:text-ink focus-visible:outline-offset-0"
          >
            {passwordVisible ? <EyeOff className="size-5" aria-hidden="true" /> : <Eye className="size-5" aria-hidden="true" />}
          </button>
        ) : null}
      </div>
      {error && (
        <p id={errorId} className="text-sm text-state-down">
          {error}
        </p>
      )}
    </div>
  )
}
