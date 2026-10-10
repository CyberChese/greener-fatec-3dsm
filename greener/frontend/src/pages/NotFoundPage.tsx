import { Link } from 'react-router'
import { PagePlaceholder } from '../components/PagePlaceholder.tsx'

export function NotFoundPage() {
  return (
    <PagePlaceholder title="Página não encontrada">
      <p>
        O endereço não existe.{' '}
        <Link to="/" className="text-brand underline underline-offset-2">
          Voltar para a visão geral
        </Link>
        .
      </p>
    </PagePlaceholder>
  )
}
