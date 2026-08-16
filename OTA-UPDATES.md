# Over-the-air updates

The menu board can update itself over the internet. You publish a new version
once; every board running the installed app downloads it in the background and
installs it overnight (around 4 AM, while the restaurant is closed). No USB
sticks, no visits to the TV.

This only works with the **installed** app (the Setup .exe), not the loose
`win-unpacked` folder.

---

## One-time setup (done once)

Updates are delivered through **GitHub Releases** — free, no server to run.

### 1. Repository — ALREADY DONE
The repo **`izzyent101/marhaba-menu-board`** exists and the app already points
at it (`package.json` > build > publish). Nothing to do here.

### 2. Get a token so the board can publish
- On GitHub: **Settings → Developer settings → Personal access tokens →
  Tokens (classic) → Generate new token**.
- Give it the **`repo`** scope. Copy the token (starts with `ghp_…`).
- On the build PC, set it once in the terminal before publishing:
  ```
  setx GH_TOKEN ghp_your_token_here
  ```
  (Close and reopen the terminal after `setx` so it takes effect.)

That's the whole setup. You won't touch it again.

---

## Pushing an update (every time you have a new version)

1. Get the new project files (the updated zip) onto the build PC and replace the
   old folder, then **bump the version**: open `package.json`, change
   `"version": "2.0.0"` to `"2.0.1"` (or whatever is next). Every release needs a
   higher number. (In these sessions Claude bumps it for you.)
2. Double-click **`publish_update.bat`**.
   - It builds the app and uploads it to a new GitHub Release automatically.
3. Done. Within a few hours every board sees the update, downloads it quietly,
   and installs it overnight. To apply immediately on a specific board, open its
   dashboard (press **D**) → **Software updates** → **Restart & update**.

---

## What the customer sees
Nothing. Downloads happen in the background with no interruption, and the
install+restart happens overnight. If a board is off overnight, it applies the
update the next time it's restarted.

## Dashboard status
Press **D** → **Software updates** shows the current version, whether a check is
running, and a **Restart & update** button when a new version is downloaded and
waiting.

## Security
The board's network is still locked down. It may reach only the weather service
and GitHub (for updates) — nothing else. Turn weather off and remove the publish
block if you ever want it fully air-gapped, but then updates stop too.

## If you'd rather not use GitHub
The same mechanism works with any web host (an S3 bucket, a web folder, etc.) —
electron-updater calls it a "generic" provider. Ask and it can be switched; the
in-app behaviour is identical.
