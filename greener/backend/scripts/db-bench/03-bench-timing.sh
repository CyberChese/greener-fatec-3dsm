#!/usr/bin/env bash
set -euo pipefail
N="${1:-15}"
PSQL="${PSQL:-psql}"
DIR="$(cd "$(dirname "$0")" && pwd)"

SVC=$($PSQL -Atqc "SELECT service_id FROM metric_collections GROUP BY service_id ORDER BY count(*) DESC, service_id LIMIT 1")
if [ -z "$SVC" ]; then echo "metric_collections está vazia: rode 01-seed-sample.sql antes." >&2; exit 1; fi

declare -A Q
Q[Q1a_hist_15m]="SELECT * FROM metric_collections WHERE service_id='$SVC' AND \"timestamp\" >= now() - interval '15 minutes' ORDER BY \"timestamp\""
Q[Q1b_hist_24h]="SELECT * FROM metric_collections WHERE service_id='$SVC' AND \"timestamp\" >= now() - interval '24 hours' ORDER BY \"timestamp\""
Q[Q1c_hist_all]="SELECT * FROM metric_collections WHERE service_id='$SVC' ORDER BY \"timestamp\""
Q[Q2_last_collection]="SELECT \"timestamp\" FROM metric_collections ORDER BY \"timestamp\" DESC LIMIT 1"
Q[Q4_status_count]="SELECT status, count(*) FROM services GROUP BY status"
Q[Q5a_totals_24h]="SELECT sum(energy_kwh), sum(co2e_g)/1000, max(\"timestamp\") FROM metric_collections WHERE \"timestamp\" >= now() - interval '24 hours'"
Q[Q5b_totals_7d]="SELECT sum(energy_kwh), sum(co2e_g)/1000, max(\"timestamp\") FROM metric_collections WHERE \"timestamp\" >= now() - interval '7 days'"
Q[Q5c_totals_all]="SELECT sum(energy_kwh), sum(co2e_g)/1000, max(\"timestamp\") FROM metric_collections"

printf '%-20s %12s %10s  %s\n' consulta mediana_ms buffers plano
for name in $(printf '%s\n' "${!Q[@]}" | sort); do
  sql="${Q[$name]}"
  $PSQL -Atqc "$sql" >/dev/null
  times=()
  for _ in $(seq "$N"); do
    t=$($PSQL -Atqc "EXPLAIN (ANALYZE, FORMAT JSON) $sql" | python3 -c 'import json,sys; print(json.load(sys.stdin)[0]["Execution Time"])')
    times+=("$t")
  done
  median=$(printf '%s\n' "${times[@]}" | sort -g | awk '{a[NR]=$1} END{print a[int((NR+1)/2)]}')
  plan=$($PSQL -Atqc "EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) $sql" | python3 -c '
import json,sys
p=json.load(sys.stdin)[0]["Plan"]
bufs=p.get("Shared Hit Blocks",0)+p.get("Shared Read Blocks",0)
nodes=[]
def walk(n):
    label=n["Node Type"]+(" ("+n["Index Name"]+")" if "Index Name" in n else "")
    if n["Node Type"] not in ("Gather","Finalize Aggregate","Partial Aggregate","Aggregate","Limit","HashAggregate"): nodes.append(label)
    for c in n.get("Plans",[]): walk(c)
walk(p)
print(f"{bufs}\t"+" > ".join(nodes))')
  printf '%-20s %12s %10s  %s\n' "$name" "$median" "${plan%%$'\t'*}" "${plan#*$'\t'}"
done
