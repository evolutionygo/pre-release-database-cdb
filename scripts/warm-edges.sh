#!/bin/sh
# Warm the new super-pre archive on CDN edges before version.txt goes out, so the first users get cache hits
# instead of a cold origin fill.
#
# Usage: warm-edges.sh <version> "<name>=<ip> ..."
#
# Only list edges whose cache key for /ygopro-super-pre/archive/ ignores Range: there one request fills the single
# cache entry for the file. On an edge that keys by Range it would only warm its own Range and cost a full origin pull.
#
# The request asks for the last byte, which the edge can only send once it holds the whole file, so a 206 means the
# fill finished. Edges are warmed one at a time to keep origin and mesh load low. Exits 1 if any edge failed.
set -u

version=$1
edges=$2
host=${WARM_HOST:-cdn02.moecube.com}
cap=${WARM_TIMEOUT:-300}
path="/ygopro-super-pre/archive/ygopro-super-pre-${version}.ypk"
failed=0

fetch() { # ip range max_time -> "code ttfb total"
  curl -sS -o /dev/null -A "mycard-ci-warm/1" -r "$2" --max-time "$3" \
    --resolve "${host}:443:$1" -w '%{http_code} %{time_starttransfer} %{time_total}' "https://${host}${path}" 2>/dev/null
}

for edge in $edges; do
  name=${edge%%=*}
  ip=${edge#*=}
  ok=0
  for try in 1 2; do
    set -- $(fetch "$ip" -1 "$cap")
    echo "warm  $name try=$try code=${1:-000} ttfb=${2:-0}s total=${3:-0}s"
    if [ "${1:-}" = 206 ]; then ok=1; break; fi
  done
  if [ $ok = 1 ]; then
    # A Range in the middle must now be a fast cache hit.
    set -- $(fetch "$ip" 10000000-10001023 30)
    echo "check $name code=${1:-000} ttfb=${2:-0}s"
    case "${1:-}" in 206) ;; *) ok=0 ;; esac
  fi
  if [ $ok = 0 ]; then
    echo "FAILED $name"
    failed=1
  fi
done
exit $failed
