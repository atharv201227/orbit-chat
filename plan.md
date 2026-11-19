# Orbit Chat implementation plan

## Product direction

A local-first desktop chatbot for users who want the ease of a modern AI chat app with the privacy of a device-hosted model runtime. Ollama is detected and started through the Electron main process; model discovery and chat requests stay on `127.0.0.1:11434`.

## Design

- **Style options:** Neo-industrial local studio (0.06); quiet paper notebook (0.03); terminal utility (0.08).
- **Chosen movement:** Neo-industrial local studio.
- **Core principles:** focused, private, tactile, calm.
- **Color philosophy:** near-black surfaces keep attention on content; acid lime marks local readiness and action; warm amber communicates setup friction without feeling alarming.
- **Layout paradigm:** a permanent utility rail anchors the app, while the chat canvas uses a narrow reading column and a low floating composer.
- **Signature elements:** skewed three-bar Orbit mark, lime local-runtime indicator, and small mono labels for system state.
- **Interaction:** setup is visible but non-blocking; starter prompts collapse into a conversation; model selection remains close to the send control.
- **Typography:** Manrope for readable UI and DM Mono for state labels, versions, and runtime metadata.
- **Brand essence:** a private AI studio for thoughtful local work; quiet, capable, grounded.
- **Brand voice:** direct and reassuring. Example: “Think locally. Move freely.” / “Your conversations stay on this device.”
- **Wordmark:** Orbit logotype paired with three ascending skewed bars to suggest a model orbiting the user’s device.
- **Signature brand color:** acid lime `#D9FF62`.

## Project structure

- `src/main.cjs`: secure Electron main process and Ollama adapter.
- `src/preload.cjs`: context-isolated renderer bridge.
- `src/index.html`: app shell and semantic UI.
- `src/styles.css`: visual system and responsive desktop layout.
- `src/renderer.js`: connection state, model selector, chat lifecycle, and starter actions.
- `scripts/`: platform-specific Ollama installers.
