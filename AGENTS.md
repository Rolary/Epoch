# Agent Notes

## Project Direction

- This is a web idle-evolution game about guiding a tide pool from lifeless water toward its own life history.
- The first chapter, "life emergence", is a completed baseline. Maintain it as a stable opening loop instead of expanding its scope.
- Current development is focused on chapter two: the first life form should differentiate, interact with other early ecological roles, and form the first small ecosystem loop.
- New systems must connect to existing life history, species, source imprints, evolution choices, events, and archive records. Do not add isolated systems that feel detached from the tide pool's memory.
- The player is an observer and guide, not an all-knowing creator. They can shape environment and selection pressure, but should not directly command exact species or deterministic outcomes.

## Gameplay And UX Rules

- The home screen must remain a living tide-pool scene with a current main goal, a clear primary action, a few key states, and unlocked entrances. Do not turn it into a resource dashboard, admin panel, or full ecological network chart.
- The opening player goal should stay simple: help this tide pool move closer to its first life, then in chapter two help existing life form a sustainable ecosystem.
- Avoid full resource tables, full environment parameter lists, giant persistent task panels, backend-style logs, and multiple parallel system panels on the main screen.
- New entrances must appear progressively through world-state feedback, events, or reward modals. Do not silently add buttons without narrative or state context.
- In-game copy should use world-facing language. Avoid labels like "system", "technical concept", "settings and save", or "log" when the player should experience "Archive", "Tide Pool Memory", "Ecology Dossier", "Codex", or "Legacy".
- Keep player-facing copy grounded in the visible game scene. Prefer concrete descriptions of water color, habitat, organism behavior, material exchange, survival pressure, and observable change over abstract commentary or generic emotional conclusions.
- Do not use AI-like poetic shorthand in place of gameplay meaning. Avoid vague phrases such as `接住`, `收住`, `托住`, `护住`, `留住`, `潮池记住自己`, `生命的影子`, or `反应窗口` unless they describe a literal, visible action. Name the actual result instead, such as attachment, filtration, material recovery, reduced evaporation, increased survival, or altered stability.
- Animations and feedback matter: feeding, water reactions, node unlocks, modal transitions, and entrance reveals should feel responsive, while respecting reduced-motion settings.

## Chapter Two Scope

- Chapter two is about forming the first small ecosystem loop, not adding more resource panels.
- Build around early ecological roles such as producers, decomposers, and filter feeders, and make their relationships visible through world feedback.
- Ecosystem events should evolve from tide-pool phenomena into balance tradeoffs, such as bloom pressure, oxygen stress, decomposition spread, or filter instability.
- The life-history view should summarize repeated ecological phenomena and pool personality, not list every operation as a raw log.
- Do not introduce formal civilization systems, large multi-map worlds, real AI services, accounts, sharing, multi-device sync, Prisma, or complex analytics as chapter-two requirements.

## Technical Boundaries

- Frontend: React + Phaser + Vite. React owns HUD, pages, sheets, modals, and guide UI; Phaser owns the tide-pool scene.
- Backend: Fastify + TypeScript.
- Shared rules belong in `packages/game-core` when behavior must be consistent across client and server.
- Persistence is PostgreSQL-backed through the server. Do not return to JSON-file, SQLite, or localStorage-as-authoritative save designs.
- AI or local generators may create expressive text and visual flavor, but must not decide core formulas, prices, probabilities, penalties, unlock conditions, or balance-critical values.

## Chinese Text And Encoding Safety

- This project contains player-facing Chinese copy. Preserve UTF-8 text exactly.
- Do not use PowerShell `Set-Content`, line-array rewrites, heredocs, or ad hoc scripts to rewrite `.ts`, `.tsx`, `.css`, `.md`, or JSON files that contain Chinese text. These commands have repeatedly corrupted otherwise valid copy.
- Prefer `apply_patch` for manual edits. If a bulk mechanical change is truly necessary, use a formatter or script only after verifying it preserves UTF-8, then inspect the diff before continuing.
- When touching player-facing copy, replace existing mojibake with clean Chinese in the same change. Do not preserve or copy garbled strings into new UI.
- For visible UI work, verify the rendered text with Playwright or browser inspection when possible; typecheck/build passing is not enough to catch mojibake.

## UI Visual Assets

- When a feature needs new UI visuals, create fit-for-purpose image assets directly with `imagegen`/Imagen instead of forcing existing images into a mismatched role; no separate user confirmation is required before generation.
- Reuse existing images only when they clearly match the new UI's meaning, style, framing, and interaction context.
- Generated assets should serve the actual feature state or gameplay moment, not act as generic decoration.


## Documentation Sync

- When code changes affect storage, API shape, shared data structures, main progression, player-facing naming, home-screen interaction, evolution behavior, codex/species structure, life-history/archive behavior, or chapter scope, update the relevant docs in `docs/`.
- Treat `docs/game-design-bible.md` as the highest-level design constraint.
- Check `docs/project-plan.md`, `docs/second-chapter-progression.md`, `docs/mobile-gameplay-ux.md`, `docs/mobile-ui-prototypes.md`, and `docs/technical-plan.md` when changing the areas they cover.
