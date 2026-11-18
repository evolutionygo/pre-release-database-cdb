#!/bin/sh
# Ask edge-warm to fill every CDN edge with a release, and wait for the core edges.
#
# Usage: edge-warm.sh <product> <version>
# Env:   EDGE_WARM_ID_TOKEN  GitLab id_token with aud=edge-warm (id_tokens: in the job)
#        EDGE_WARM_URL       service base URL (default https://warm.moenext.com)
#        EDGE_WARM_WAIT      seconds to wait for the core edges (default 180)
#
# Waits until every core edge is filled, a core edge failed, or the wait runs out; the service goes on filling the
# other edges after this exits. Prints per-tier counts only, since CI logs may be public. Exits 0 when the core
# edges are filled, 1 otherwise: run the job with allow_failure, a warm must never block a release.
set -u

product=$1
version=$2
base=${EDGE_WARM_URL:-https://warm.moenext.com}
wait_s=${EDGE_WARM_WAIT:-180}
token=${EDGE_WARM_ID_TOKEN:?EDGE_WARM_ID_TOKEN is not set}

req() { # method path [body] -> body on stdout; fails on HTTP errors
  curl -sS --fail-with-body --max-time 20 -A "edge-warm-ci/1" -X "$1" -H "Authorization: Bearer ${token}" \
    -H "Content-Type: application/json" -H "Accept: ${ACCEPT:-application/json}" ${3:+--data "$3"} "${base}$2"
}

out=$(req POST "/v1/products/${product}/warms" "{\"version\":\"${version}\"}") || {
  echo "edge-warm: request failed: ${out}"
  exit 1
}
id=$(printf '%s' "$out" | sed -n 's/.*"id": *"\([0-9a-f]\{32\}\)".*/\1/p')
[ -n "$id" ] || { echo "edge-warm: no job id in reply"; exit 1; }
echo "edge-warm: job ${id}"

start=$(date +%s)
last=""
while :; do
  status=$(ACCEPT=text/plain req GET "/v1/warms/${id}") || status=""
  state=$(printf '%s\n' "$status" | sed -n 's/^state=//p')
  core=$(printf '%s\n' "$status" | sed -n 's/^core=//p')
  summary=$(printf '%s\n' "$status" | sed -n 's/^summary=//p')
  if [ -n "$summary" ] && [ "$summary" != "$last" ]; then
    echo "edge-warm: ${state}: ${summary}"
    last=$summary
  fi
  # The release waits for the core edges only; the extra edges are reported, never waited for.
  case "$core" in
    ok) exit 0 ;;
    failed)
      printf '%s\n' "$status" | sed -n 's/^error=/edge-warm: error: /p'
      echo "edge-warm: core edges not all filled; going on"
      exit 1 ;;
  esac
  if [ $(( $(date +%s) - start )) -ge "$wait_s" ]; then
    echo "edge-warm: core edges not filled after ${wait_s}s (${state:-no reply}); going on"
    exit 1
  fi
  sleep 5
done
