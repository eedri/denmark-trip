#!/bin/bash
# Repack the private build sources into cloud-src.enc (repo root) so a Claude Code
# cloud session can edit the app from a phone — see CLOUD.md.
# Encryption matches the app itself: AES-256-CBC, PBKDF2 x600000, SHA-256, salted.
# The key is the owner password in private/password.txt (never committed).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# Owner password: password.txt on the Mac, else TRIP_PW from the env (cloud/phone session).
if [ -f "$ROOT/private/password.txt" ]; then
  TRIP_PW="$(cat "$ROOT/private/password.txt")"
fi
: "${TRIP_PW:?no password.txt and no TRIP_PW env — cannot pack cloud-src.enc}"
export TRIP_PW
# Bundle the app source ONLY — never the password files (they'd land in the public repo).
# On rebuild, the cloud/phone session supplies TRIP_PW + TRIP_GUEST_PW from the chat.
tar -czf - -C "$ROOT" \
  private/app.html \
  private/build.py \
  private/lock-template.html \
| openssl enc -aes-256-cbc -pbkdf2 -iter 600000 -md sha256 -salt \
    -pass env:TRIP_PW -out "$ROOT/cloud-src.enc"
echo "OK: packed cloud-src.enc ($(wc -c < "$ROOT/cloud-src.enc" | tr -d ' ') bytes)"
