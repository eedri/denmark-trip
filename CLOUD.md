# Editing the trip app from a Claude Code cloud session (phone)

This repo publishes a password-protected trip itinerary app (`index.html`, served at
https://eedri.github.io/denmark-trip/). The editable source is NOT in the repo —
it lives in **`cloud-src.enc`**: an AES-256-CBC (PBKDF2 x600000, SHA-256) encrypted
tar of the app-build files. It contains **no passwords** — the user supplies the
owner password (and any guest password) in their chat message.

**Rules: never print or echo the passwords, and never write them to a file that gets
committed. Never commit anything under `private/` (it is gitignored — keep it that
way). Commit only `index.html` and `cloud-src.enc`.**

## Steps

1. **Restore the sources** (owner password comes from the user's message):

   ```bash
   TRIP_PW='<owner password from user>' bash cloud/unpack.sh
   ```

   This recreates `private/` with the app-build files only: `app.html` (a single
   self-contained HTML file with a `days` array of day cards plus checklist/tracker
   arrays), `build.py`, `lock-template.html`. There is **no** `password.txt` or
   `guest-passwords.txt` — that is intentional.

2. **Make the requested edits** in `private/app.html`. Day cards live in the
   `const days = [...]` array (fields: `date`, `title`, `legs`, `booking`, `sleep`,
   `eat`, `attractions`, `activities`, `notes`, ...). Trackers: `bookNow`,
   `checklist`, `vanChecks`, `emergencyInfo`, `foodShop`, `vanShop`.

3. **Rebuild** — pass the passwords via env vars (do NOT write them to files):

   ```bash
   TRIP_PW='<owner password>' TRIP_GUEST_PW='<guest password>' python3 private/build.py
   ```

   - `TRIP_PW` = owner password (same one used to unpack). Required.
   - `TRIP_GUEST_PW` = guest password(s), comma/newline-separated. Include it so the
     friend's access is preserved; omit only if the user says to drop guest access.
   - The bundle has no `bookings.json` (real codes stay on the owner's Mac), so
     build.py auto-runs in **cloud mode**: prints `cloud mode … building index.html
     only` and skips the private trip-full.html/email. That is expected — do not try
     to add booking codes or hunt for bookings.json.

   This regenerates the encrypted `index.html` (owner + guest payloads) and refreshes
   `cloud-src.enc`.

4. **Commit & push** `index.html` and `cloud-src.enc` only, to `main`
   (GitHub Pages deploys from main — the live app updates ~a minute later).
   If pushing to main isn't permitted from this environment, push a branch,
   open a PR titled "trip app update", and give the user the merge link.

5. Tell the user the change is live (they may need to close & reopen the app
   once for the service worker to pick up the new version).
