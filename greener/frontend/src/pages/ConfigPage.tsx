import { PagePlaceholder } from '../components/PagePlaceholder.tsx'

export function ConfigPage() {
  return (
    <PagePlaceholder title="Configuração do monitoramento">
      <p>
        Área protegida: só aparece com sessão ativa. Os parâmetros de monitoramento (RF16),
        como o intervalo de coleta, serão configurados aqui.
      </p>
    </PagePlaceholder>
  )
}
