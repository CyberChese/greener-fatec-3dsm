# Cálculos de Energia e CO₂e

> **Situação:** o cálculo das estimativas de energia (kWh) e de emissões (CO₂e) **não faz parte da Sprint 1** e está previsto para a Sprint 2, conforme o [plano de entregas](plano-de-entregas.md).
> Este documento registra os dados de entrada que o sistema já coleta e a estrutura que será preenchida quando o cálculo for implementado.

## 1. Dados de entrada já coletados (Sprint 1)

A cada ciclo de coleta, o backend grava em `metric_collections` os valores recebidos do Agregador de Métricas:

| Campo do Agregador | Coluna no GreenER | Unidade | Faixa válida |
|---|---|---|---|
| `cpu_percent` | `cpu_usage` | percentual | 0 a 100 |
| `memory_gb` | `memory_usage` | GB | ≥ 0 |
| `disk_gb` | `storage_usage` | GB | ≥ 0 |
| `network_gb` | `network_io` | GB | ≥ 0 |
| — | `timestamp` | data e hora (UTC) | instante em que a resposta foi recebida |

Valores fora dessas faixas não são gravados e o serviço é marcado como `NO_METRICS` (ver [`arquitetura.md`](arquitetura.md#32-coleta-periódica-de-métricas)).

Cada serviço também tem localização (`country`, `region`, `city`, `latitude`, `longitude`). O código de região (`region_code`), necessário para consultar a intensidade de carbono, é recebido do Agregador, mas ainda não é gravado. Isso está registrado como pendência da Sprint 1.

## 2. Estrutura prevista para a Sprint 2

Quando o cálculo for implementado, este documento deve conter:

| Item | Conteúdo a documentar |
|---|---|
| Fórmula de energia | Como CPU, memória, armazenamento e rede são convertidos em kWh |
| Fatores | Valor, unidade e fonte de cada fator utilizado |
| Intensidade de carbono | Origem (serviço da UniLaunch), unidade (gCO₂e/kWh) e região consultada |
| Fórmula de emissão | Conversão de kWh em CO₂e |
| Período | Intervalo de tempo a que cada estimativa se refere |
| Dados ausentes | Tratamento quando uma métrica ou a intensidade de carbono não estiver disponível |
| Exemplo | Cálculo completo com valores reais de uma coleta |

## 3. Histórico

| Data | Alteração |
|---|---|
| 19/10/2026 | Documentação dos dados de entrada coletados na Sprint 1 e da estrutura prevista para a Sprint 2 |
