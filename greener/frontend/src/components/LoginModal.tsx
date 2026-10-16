import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../hooks/useAuth.ts'
import { useLoginRedirect } from '../hooks/useLoginRedirect.ts'
import { toApiError } from '../services/apiError.ts'
import type { ApiError } from '../services/apiError.ts'
import { requestLogin } from '../services/authApi.ts'
import { FormField } from './FormField.tsx'
import { CloseIcon, LockIcon } from './icons.tsx'

type FieldErrors = {
  email?: string
  password?: string
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {}
  if (!email.trim()) errors.email = 'Informe o e-mail.'
  else if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'Informe um e-mail válido.'
  if (!password) errors.password = 'Informe a senha.'
  return errors
}

// A mensagem depende do tipo de falha: "senha errada" e "servidor fora do ar" não podem
// parecer a mesma coisa. Para credenciais, a mensagem é genérica de propósito: não revela
// se o e-mail existe.
function messageFor(error: ApiError): string {
  switch (error.kind) {
    case 'unauthorized':
      return 'E-mail ou senha incorretos.'
    case 'client':
      return error.message
    default:
      return 'Serviço indisponível no momento. Tente novamente em instantes.'
  }
}

export function LoginModal() {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const target = useLoginRedirect()
  const { login, sessionExpired } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // <dialog> nativo: dá foco preso, Esc para fechar e fundo inerte.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (!dialog.open) dialog.showModal()
    emailRef.current?.focus()
    return () => {
      if (dialog.open) dialog.close()
    }
  }, [])

  function close() {
    navigate('/', { replace: true })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return

    const errors = validate(email, password)
    setFieldErrors(errors)
    setFormError(null)
    if (errors.email) {
      emailRef.current?.focus()
      return
    }
    if (errors.password) {
      passwordRef.current?.focus()
      return
    }

    setSubmitting(true)
    try {
      const token = await requestLogin({ email: email.trim(), password })
      login(token, email.trim())
      navigate(target, { replace: true })
    } catch (error) {
      setFormError(messageFor(toApiError(error)))
      setPassword('')
      passwordRef.current?.focus()
    } finally {
      setSubmitting(false)
    }
  }

  const alertMessage = formError ?? (sessionExpired ? 'Sua sessão expirou. Entre novamente.' : null)

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="login-title"
      aria-describedby="login-description"
      onCancel={(event) => {
        event.preventDefault()
        close()
      }}
      onClick={(event) => {
        // Clique no fundo escurecido (o alvo é o próprio <dialog>) fecha o modal.
        if (event.target === dialogRef.current) close()
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-line bg-surface p-0 text-ink backdrop:bg-black/70"
    >
      <div className="flex flex-col gap-6 p-8">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand/15 text-brand">
            <LockIcon />
          </span>
          <div className="flex flex-col gap-1">
            <h2 id="login-title" className="text-2xl font-semibold tracking-tight">
              Área do Administrador
            </h2>
            <p id="login-description" className="text-ink-muted">
              Entre para configurar o monitoramento e consultar o histórico das coletas.
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Fechar"
            className="-mr-2 -mt-2 ml-auto grid h-11 w-11 shrink-0 place-items-center rounded-lg text-ink-muted hover:text-ink"
          >
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
          {alertMessage && (
            <p
              role="alert"
              className="rounded-xl border border-state-down/40 bg-state-down/10 px-4 py-3 text-sm text-state-down"
            >
              {alertMessage}
            </p>
          )}

          <FormField
            id="login-email"
            label="E-mail"
            type="email"
            name="email"
            autoComplete="username"
            placeholder="voce@exemplo.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={fieldErrors.email}
            ref={emailRef}
          />
          <FormField
            id="login-password"
            label="Senha"
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={fieldErrors.password}
            ref={passwordRef}
          />

          <button
            type="submit"
            disabled={submitting}
            aria-busy={submitting}
            className="h-13 w-full rounded-xl bg-brand font-semibold text-on-brand transition hover:brightness-110 disabled:cursor-wait disabled:opacity-70"
          >
            {submitting ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </dialog>
  )
}
