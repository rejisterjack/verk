# Verk desktop

A native window around your Verk site. It is a separate package, so Electron is never part of the
web app's install.

```bash
cd desktop
npm install
VERK_URL=https://your-verk.example npm start     # run it
VERK_URL=https://your-verk.example npm run dist  # build an installer
```

- Same account and data as the web app; the login persists between launches.
- Only `VERK_URL`'s site loads in the window. Other links open in your browser.
- No Node access from the page (context isolation, sandbox).
- Menu: Go → My issues (`⌘1`), Inbox (`⌘2`), New issue (`⌘N`).

This is a shell, not a rewrite: it needs the site to be reachable, so it is not an offline app. The
web app's own offline queue still works inside it.

The installers are unsigned. Signing and notarization need your own developer certificates.