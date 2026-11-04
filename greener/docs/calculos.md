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
| `co2e_kg` | A mesma emissão convertida em quilogramas de CO₂e |

Fórmulas: `co2e_g = energy_kwh × carbon_intensity_gco2e_per_kwh` e `co2e_kg = co2e_g ÷ 1.000`. A unidade resulta em gramas e quilogramas de CO₂e, respectivamente. O fator é normalizado para 8 casas decimais antes do cálculo para que o valor aplicado seja igual ao persistido; gramas usam 8 casas (`numeric(20,8)`) e quilogramas 11 (`numeric(20,11)`). O serviço pode reprocessar uma coleta pelo seu ID: lê energia e fator persistidos e atualiza a mesma linha, sem inserir outra coleta. O valor de fallback vem de `CARBON_INTENSITY_FALLBACK_G_PER_KWH` e deve ser definido pelo operador conforme o ambiente; o sistema não inventa um fator padrão. Timeout, erro HTTP, resposta inválida ou região ausente/desconhecida acionam o fallback e geram aviso de log quando o fator está configurado. Se estiver ausente, o erro é explícito e aquela coleta não é persistida. A flag persistida permite auditar quais estimativas o utilizaram.

O cálculo detalhado de energia e as premissas dos fatores físicos continuam sujeitos à validação do Product Owner; valores da simulação do frontend não são usados pelo backend.

## 3. Modelo de energia implementado (TASK-020)

O cálculo recebe CPU em percentual, memória em MB e duração em segundos. CPU deve estar entre 0 e 100; memória deve ser não negativa. Entradas ausentes, não finitas ou fora dessas faixas são rejeitadas. A duração é obrigatória, positiva e finita; na coleta, o backend usa o `collection_interval_seconds` positivo e válido do Agregador.

```text
cpu_watts = 20 + (100 - 20) × (cpu_percent ÷ 100)
memory_watts = (memory_mb ÷ 1024) × 0,375
energy_kwh = (cpu_watts + memory_watts + disk_watts + network_watts)
             × duration_seconds ÷ 3.600.000
```

Quando taxas válidas são fornecidas diretamente ao motor, `disk_watts = disk_MBps × 0,001` e `network_watts = network_MBps × 0,005`. A coleta atual não as fornece: o Agregador reporta disco e rede em GB, sem unidade temporal/janela documentada. Esses valores continuam persistidos e ficam fora da energia estimada até existir um contrato que permita derivar taxas sem suposições. A energia é arredondada para 8 casas decimais antes de persistir e rejeitada se exceder `9.999,99999999 kWh`, limite de `numeric(12,8)` usado pela coluna `energy_kwh`. Os coeficientes de potência acima são os parâmetros atuais no código e ainda aguardam validação do Product Owner; esta documentação registra a implementação, não uma validação científica independente.

## 4. Períodos de referência exibidos (TASK-033)

Cada indicador da interface informa a janela de tempo a que se refere (IHC03). O backend grava energia e CO₂e **por coleta**; o frontend só agrega valores já calculados, sem refazer as fórmulas.

| Onde aparece | Período de referência | Como é obtido |
|---|---|---|
| Indicadores consolidados do Observatório (energia total, CO₂e total) | **Acumulado de todas as coletas registradas** | `GET /api/metrics/summary` soma `energy_kwh` e `co2e_kg` de todas as coletas armazenadas |
| Energia e CO₂e de cada serviço no Dashboard (cards, tabela, comparação, popups do mapa) | **Últimos 15 minutos** | Soma de `energy_kwh` e `co2e_kg` das coletas do serviço em `GET /api/services/:id/history?from=<agora − 15 min>` |
| Intensidade de carbono de cada serviço | **Coleta mais recente** do serviço | `carbon_intensity_gco2e_per_kwh` da última linha do histórico que a informou; `carbon_intensity_fallback` indica se foi o valor padrão |

Por que 15 minutos: uma única coleta cobre o intervalo de coleta do Agregador (≈30 s) e gera valores da ordem de 0,0004 kWh, pequenos demais para leitura. A janela de 15 minutos reúne cerca de 30 coletas e usa a mesma consulta de histórico que já alimenta as métricas atuais (CPU, memória, disco e rede), sem requisição adicional. Os dois períodos são diferentes de propósito, e por isso o valor de um serviço não deve ser comparado com o total acumulado do Observatório.

Regras de agregação:

- Coletas sem `energy_kwh` ou `co2e_kg` (por exemplo, anteriores ao cálculo) **não entram na soma** e não valem zero.
- Se nenhuma coleta da janela tiver o valor, ou se o serviço não estiver `ACTIVE`, a tela mostra "—".
- Se `co2e_kg` não vier, usa-se `co2e_g ÷ 1.000`.
- A intensidade exibida é a da coleta mais recente, e não uma média.

Exemplo (CPU 50 %, memória 2 GB, intervalo de 30 s, intensidade 400 gCO₂e/kWh, 30 coletas iguais na janela):

```text
potência por coleta = 20 + 80 × 0,5 + 2 × 0,375 = 60,75 W
energia por coleta  = 60,75 × 30 ÷ 3.600.000 = 0,00050625 kWh
energia em 15 min   = 30 × 0,00050625 = 0,0151875 kWh
CO₂e em 15 min      = 0,0151875 × 400 = 6,075 g = 0,006075 kg
```

No modo `simulated` (demonstração) o painel continua somando as coletas simuladas do período escolhido (últimas 10 coletas ou sessão inteira).

## 5. Histórico

| Data | Alteração |
|---|---|
| 19/10/2026 | Documentação dos dados de entrada coletados na Sprint 1 e da estrutura prevista para a Sprint 2 |
| 29/10/2026 | Documentada a integração regional, a emissão por coleta e a auditoria do fallback |
| 03/11/2026 | Documentadas precisão e conversão para quilogramas da TASK-022 |
| 03/11/2026 | Documentados os períodos de referência dos indicadores (acumulado, últimos 15 min e coleta mais recente) da TASK-033 |
