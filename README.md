> [!WARNING]
> **This is early alpha software — here be dragons.**
> There is **no persistence yet**. If you refresh the page, **your work is gone**. This is the most important thing to know before you use it.
>
> That said — if the idea appeals to you, please try it! Open issues when you find bugs. Real-world use cases help more than anything.

---

# Lorewalker

Lorewalker is a local-first lorebook editor, visualizer, and analysis tool for AI roleplay platforms like SillyTavern. It transforms flat JSON lorebook files into an interactive graph-based editing experience — letting you see how your entries connect, catch structural problems, and simulate activation, all without any backend or account.

---

![Lorewalker](docs/lorewalker.png)

![Entry Editor](docs/editor-modal.png)

## What's Working Now (Phases 0–2)

- **Import / Export** — drag-and-drop or file picker; full SillyTavern lorebook JSON round-trip
- **Entry editor** — all CCv3 lorebook entry fields with live token counting
- **Multi-tab workspace** — open multiple lorebooks at once, each with independent undo/redo
- **Recursion graph** — interactive node graph visualizing keyword-triggered entry chains
  - Solid edges = active links; dashed = blocked (`preventRecursion` / `excludeRecursion`); red = cycle
  - Auto-layout (dagre), minimap, zoom, fit-to-view
  - Bidirectional selection: click a node to highlight the entry in the list, and vice versa
  - Double-click a node to jump straight to editing that entry
- **Theme system** — 14+ themes including Catppuccin variants, Nord, One Dark, Dracula, Rosé Pine, Tokyo Night, and light variants

---

## What's Coming (Phases 3–8)

| Phase | Feature |
|-------|---------|
| 3 | **Deterministic health analysis** — 28 built-in rules across structure, configuration, keywords, recursion, and budget categories; real-time health scoring |
| 4 | **Activation simulator** — simulate SillyTavern's entry activation logic against mock messages, with step-by-step recursion trace |
| 5 | **Autosave & crash recovery** — IndexedDB-backed autosave; restore your session after a browser crash *(this is when the "refresh = data loss" problem goes away)* |
| 6 | **LLM-powered deep analysis** — BYOK qualitative review via any OpenAI-compatible endpoint or Anthropic; content quality, keyword suggestions, splitting recommendations |
| 7 | **Graph editing** — create and delete recursion links by dragging edges directly on the graph canvas |
| 8 | **Desktop app** — Tauri-based native wrapper with native file dialogs and system keychain for API keys |

---

## Running Locally

```bash
git clone https://github.com/Rukongai/Lorewalker
cd Lorewalker
npm install
npm run dev
```

Then open `http://localhost:5173` in your browser.

> No account, no backend, no network requests. Everything runs in your browser.

---

## Tech Stack

- [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vitejs.dev/)
- [@xyflow/react](https://reactflow.dev/) — graph canvas
- [Zustand](https://zustand-demo.pmnd.rs/) + [immer](https://immerjs.github.io/immer/) + [zundo](https://github.com/charkour/zundo) — state and undo/redo
- [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- [@character-foundry/character-foundry](https://github.com/character-foundry/character-foundry) — lorebook format parsing

---

## Contributing / Issues

Found a bug? Have a use case that doesn't work? [Open an issue](https://github.com/Rukongai/Lorewalker/issues). Real-world use cases are genuinely the most helpful thing at this stage — they shape which features get prioritized.

---

## Support

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/rukongai)

If Lorewalker saves you time or sanity, consider buying me a coffee. It's entirely optional but very appreciated.
