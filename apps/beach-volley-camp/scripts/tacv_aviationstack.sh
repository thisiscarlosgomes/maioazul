#!/usr/bin/env bash
set -euo pipefail

AVIATIONSTACK_KEY="ee3be296d597b2f2de4cc32e6df9aae0"

ROUTES=("RAI:MMO" "MMO:RAI")

TODAY="$(date +%F)"
BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
OUT_DIR="${BASE_DIR}/../out"

mkdir -p "$OUT_DIR"

echo "Today: $TODAY"
echo

filter_route() {
  local infile="$1"
  local origin="$2"
  local dest="$3"
  local outfile="$4"

  python3 - <<PY
import json
from pathlib import Path

raw = Path("$infile").read_text().strip()

try:
    data = json.loads(raw)
except Exception:
    Path("$outfile").write_text(raw)
    raise SystemExit(0)

# Pass through API error objects unchanged
if isinstance(data, dict) and "error" in data:
    Path("$outfile").write_text(json.dumps(data, ensure_ascii=False, indent=2))
    raise SystemExit(0)

items = data.get("data", [])
if not isinstance(items, list):
    Path("$outfile").write_text(json.dumps(data, ensure_ascii=False, indent=2))
    raise SystemExit(0)

filtered = [
    x for x in items
    if isinstance(x, dict)
    and x.get("departure", {}).get("iataCode") == "$origin"
    and x.get("arrival", {}).get("iataCode") == "$dest"
]

out = {"date": "$TODAY", "route": "$origin-$dest", "data": filtered}
Path("$outfile").write_text(json.dumps(out, ensure_ascii=False, indent=2))
PY
}

for route in "${ROUTES[@]}"; do
  origin="${route%%:*}"
  dest="${route##*:}"

  echo "Flights (today) for $origin -> $dest"
  curl -sS "https://api.aviationstack.com/v1/timetable?iataCode=${origin}&type=departure&airline_iata=VR&access_key=${AVIATIONSTACK_KEY}" \
    -o "${OUT_DIR}/tmp_timetable_${origin}_${TODAY}.json"
  filter_route "${OUT_DIR}/tmp_timetable_${origin}_${TODAY}.json" "$origin" "$dest" \
    "${OUT_DIR}/stack_today_${origin}_${dest}.json"

  echo "Sleeping 61s to respect free-plan limit..."
  sleep 61
done

echo
echo "Done. Output in ${OUT_DIR}"
