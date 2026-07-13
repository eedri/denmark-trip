#!/bin/bash
# Restore the private/ build sources from cloud-src.enc.
# Usage:  TRIP_PW='the-trip-password' bash cloud/unpack.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
: "${TRIP_PW:?Set TRIP_PW to the trip password}"
openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -md sha256 \
  -pass env:TRIP_PW -in "$ROOT/cloud-src.enc" | tar -xzf - -C "$ROOT"
echo "OK: private/ restored ($(ls "$ROOT/private" | wc -l | tr -d ' ') files)"
