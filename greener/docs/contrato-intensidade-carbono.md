# Contrato — Greener Carbon Intensity API (UniLaunch)

Especificação oficial: <https://carbon.unilaunch.org/openapi.json>  
Documentação interativa: <https://carbon.unilaunch.org/docs>  
Cliente no GreenER: `backend/src/modules/carbon-intensity/carbon-intensity-client.service.ts`.

## Consulta regional

| Item | Contrato |
|---|---|
| URL base de produção | `https://carbon.unilaunch.org` |
| Método | `GET` |
| Rota | `/regions/{code}/carbon-intensity` |
| Parâmetro regional | `code`, no caminho; código `region_code` persistido pelo GreenER |
| Autenticação | Nenhuma indicada no OpenAPI |
| Timeout no GreenER | 5000 ms por padrão; configuração limitada ao intervalo de 1 a 5000 ms |
| Unidade | `carbon_intensity_gco2e_per_kwh`, em gCO₂e/kWh, conforme o nome do campo e a descrição da API |

O cliente não envia corpo nem parâmetros de query. Exemplo real de consulta:

```http
GET https://carbon.unilaunch.org/regions/br-sudeste/carbon-intensity
Accept: application/json
```

Resposta observada e documentada:

```json
{
  "region_code": "br-sudeste",
  "country": "Brazil",
  "region": "Sudeste",
  "city": "Sao Paulo",
  "carbon_intensity_gco2e_per_kwh": 85.0,
  "renewable_share_percent": 83.0
}
```

O schema OpenAPI exige `region_code`, `country`, `region`, `carbon_intensity_gco2e_per_kwh` e `renewable_share_percent`. O GreenER também confere se a resposta corresponde ao código solicitado, se o fator é finito e não negativo e se a participação renovável está entre 0 e 100. `city` é opcional e não é necessário para o cálculo.

## Falhas e fallback

- HTTP `404` significa que a região não está registrada.
- Timeout, falha HTTP/5xx, indisponibilidade, região ausente/não encontrada ou resposta fora do schema aplicam `CARBON_INTENSITY_FALLBACK_G_PER_KWH`.
- O fallback é numérico e não negativo. Não há valor presumido no código: cada ambiente deve configurá-lo conforme a política aprovada. Sem essa configuração, a API continua disponível quando responde corretamente; se o fallback for necessário, o erro de configuração é registrado e a coleta daquele serviço não é persistida.
- Cada aplicação do fallback registra um aviso e retorna `usedFallback: true`; a coleta persiste o fator, o resultado de CO₂e e `carbon_intensity_fallback` para auditoria.
- As falhas externas são isoladas por serviço durante o ciclo; as demais coletas continuam.

## Histórico

| Data | Alteração |
|---|---|
| 29/10/2026 | Contrato OpenAPI e resposta de produção conferidos; documentados consulta regional, unidade e fallback |
