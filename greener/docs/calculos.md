# Cálculos de Energia e CO₂e

> O backend persiste a energia estimada, consulta o fator regional e registra a estimativa de CO₂e por coleta. As premissas do modelo de energia ainda precisam de validação do Product Owner.

## 1. Dados de entrada da coleta

A cada ciclo de coleta, o backend grava em `metric_collections` os valores recebidos do Agregador de Métricas:

| Campo do Agregador | Coluna no GreenER | Unidade | Faixa válida |
|---|---|---|---|
| `cpu_percent` | `cpu_usage` | percentual | 0 a 100 |
| `memory_gb` | `memory_usage` | GB | ≥ 0 |
| `disk_gb` | `storage_usage` | GB | ≥ 0 |
| `network_gb` | `network_io` | GB | ≥ 0 |
| — | `timestamp` | data e hora (UTC) | instante em que a resposta foi recebida |

Valores fora dessas faixas não são gravados e o serviço é marcado como `NO_METRICS` (ver [`arquitetura.md`](arquitetura.md#32-coleta-periódica-de-métricas)).

Cada serviço também tem localização (`country`, `region`, `city`, `latitude`, `longitude`) e o código `region_code` recebido do Agregador é persistido para consultar a intensidade regional.

## 2. Intensidade de carbono e emissões

O backend consulta a [API oficial de Intensidade de Carbono](contrato-intensidade-carbono.md) usando o `region_code` persistido. O fator e a procedência ficam registrados por coleta:

| Coluna | Conteúdo |
|---|---|
| `carbon_intensity_gco2e_per_kwh` | Fator retornado pela API ou fallback configurado, em gCO₂e/kWh |
| `carbon_intensity_fallback` | `true` quando o fator da coleta veio do fallback; `false` quando veio da API |
| `co2e_g` | Emissão estimada em gramas de CO₂e |

Fórmula: `co2e_g = energy_kwh × carbon_intensity_gco2e_per_kwh`. A unidade resulta de `kWh × gCO₂e/kWh = gCO₂e`. O valor de fallback vem de `CARBON_INTENSITY_FALLBACK_G_PER_KWH` e deve ser definido pelo operador conforme o ambiente; o sistema não inventa um fator padrão. Timeout, erro HTTP, resposta inválida ou região ausente/desconhecida acionam o fallback e geram aviso de log quando o fator está configurado. Se estiver ausente, o erro é explícito e aquela coleta não é persistida. A flag persistida permite auditar quais estimativas o utilizaram.

O cálculo detalhado de energia e as premissas dos fatores físicos continuam sujeitos à validação do Product Owner; valores da simulação do frontend não são usados pelo backend.

## 3. Histórico

| Data | Alteração |
|---|---|
| 19/10/2026 | Documentação dos dados de entrada coletados na Sprint 1 e da estrutura prevista para a Sprint 2 |
| 29/10/2026 | Documentada a integração regional, a emissão por coleta e a auditoria do fallback |
