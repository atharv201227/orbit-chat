# Orbit Chat

Orbit Chat is a desktop-first local AI chatbot powered by [Ollama](https://ollama.com). The app keeps chat requests on `127.0.0.1`, discovers installed models, and lets the user switch models from the composer.

## Run in development

```bash
npm install
npm run dev
```

Then install a model in another terminal, for example:

```bash
ollama pull llama3.2
```

Orbit detects Ollama automatically on startup. If the runtime is missing, the setup banner runs the bundled platform installer; if that is blocked by permissions or network policy, it falls back to the official download page.

## Build installers

```bash
npm run dist:linux  # AppImage
npm run dist:win    # NSIS installer
npm run dist:mac    # DMG
```

The Windows target is configured as an unsigned development installer and skips executable signing/editing, so it does not require Windows symbolic-link privileges. For a signed production installer, remove `signAndEditExecutable: false` and build with a configured code-signing certificate.

The `scripts/` folder contains platform setup scripts that can be wired into a signed installer or first-run wizard for fully automatic Ollama provisioning. A production installer should present the Ollama license and request administrator permission where the platform requires it.

## Architecture

- `src/main.cjs` — Electron main process, local Ollama HTTP bridge, runtime detection and process startup.
- `src/preload.cjs` — context-isolated IPC bridge.
- `src/index.html`, `src/styles.css`, `src/renderer.js` — Orbit Chat interface and interaction state.
- `scripts/` — Linux/macOS shell installer and Windows PowerShell installer.
