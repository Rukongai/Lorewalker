# Lorewalker — Project Brief

## What It Is

Lorewalker is a lorebook editor, visualizer, and analysis tool for AI roleplay applications. Lorebooks (also called World Info or Memory Books) are collections of entries that inject contextual information into an AI's context window during roleplay based on keyword matching. They're used by SillyTavern, Agnai, RisuAI, and other platforms.

Lorewalker provides three things existing tools don't:

1. **A visual graph editor** that shows how entries connect through keyword-triggered recursion, making the invisible activation network visible and editable.
2. **Automated analysis** that detects structural issues (circular references, dead links, orphaned entries, budget overflows) and provides a health score with actionable findings — including LLM-powered qualitative assessment.
3. **An activation simulator** that lets you test how entries would fire against mock messages without running SillyTavern itself.

## Why It Exists

Lorebooks are essentially directed graphs disguised as flat JSON files. Entries trigger other entries through keyword matching in content, creating cascading activation chains. When these chains have loops, dead ends, or budget overflows, the lorebook breaks in subtle ways that are invisible in a list editor. Authors need a tool that understands the graph structure and surfaces problems before they manifest during roleplay.

## Technical Shape

- **Local-first web application** — no backend, no auth, no server-side storage. All data stays in the browser.
- **Desktop variant** via Tauri wrapper (deferred, web-first).
- **File-based workflow** — import lorebook JSON (any supported format), edit, export. IndexedDB for autosave/crash recovery only.
- **Multi-tab workspace** — multiple lorebooks open simultaneously with independent undo/redo history per tab.
- **BYOK LLM integration** — users provide their own API keys for qualitative analysis. Supports OpenAI-compatible endpoints (covers OpenAI, Ollama, LM Studio, Together, Groq), with Anthropic as a second provider. No LLM calls without explicit user action.
- **Built on character-foundry** — the `@character-foundry/character-foundry` npm package handles format detection, parsing, normalization to CCv3, serialization, and token counting. Lorewalker builds the editing, analysis, and visualization layers on top.

## Scope Boundaries

**In scope:**
- Lorebook editing (form-based and visual graph)
- Multi-format import/export (SillyTavern, Agnai, Risu, Wyvern, CCv3)
- Recursion graph visualization and editing
- Deterministic analysis (structural validation, configuration logic, keyword analysis, recursion architecture, token budgeting)
- LLM-powered qualitative analysis (content quality, keyword strategy, entry splitting suggestions)
- Activation simulation (keyword matching, selective logic, recursion, budget constraints)
- Health scoring with pluggable rubrics
- Crash recovery via IndexedDB autosave

**Out of scope (for now):**
- Character card editing (cards may contain lorebooks, but we extract and edit the lorebook, not the card)
- Real-time collaboration
- Cloud storage or sync
- Publishing or sharing lorebooks
- Fetching linked lorebooks from external sources (we parse what's given to us)
- Custom rubric authoring UI (the interface supports it, but the UI is deferred)

## Key Decisions Made During Design

| Decision | Rationale |
|----------|-----------|
| Local-first, no backend | Keeps deployment simple, protects user privacy (especially API keys), matches the personal-tool nature of lorebook editing |
| Flatten CCv3 to WorkingEntry | The CCv3 schema nests platform-specific fields in extensions. A flat WorkingEntry makes the editor and analysis engine cleaner. Import/export handles the transformation. |
| One Zustand store per tab | Undo/redo must be scoped per document. Sharing a single store would entangle histories. |
| Derived graph, not stored | The recursion graph is computed from entry data. Storing it would create sync bugs. Incremental recomputation keeps it fast. |
| Pluggable activation engines | SillyTavern first, but the simulator interface supports adding Agnai/Risu engines later without refactoring. |
| Pluggable analysis rubrics | Start with the built-in review checklist. The Rule interface supports custom rubrics and LLM-powered rules through the same abstraction. |
| BYOK LLM, on-demand only | No surprise API costs. Deterministic analysis runs automatically. LLM analysis runs when explicitly requested. |
| OpenAI-compatible as first LLM provider | Covers the widest ground: OpenAI, Ollama, LM Studio, Together, Groq, and any other service with a compatible API. |
| Dark mode default | User preference. Light mode available as an option. |
