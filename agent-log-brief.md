# Agent Log (Brief)

| Date | Action |
|------|--------|
| 2026-04-08 | Documentation session: Added QN mode section to README.md; documented commit 141eabb in agent-log.md (mode toggle, simplified input UI, coordinate generation); updated agent-log-brief.md; marked both QN todos complete in agent-instruction.md. Commit 3cf54cc. |
| 2026-04-08 | Implemented QN mode (commit 141eabb): added mode toggle button in header; QN input UI with simplified table (x₁(t), y₁(t), aₓ, aᵧ); automatic coordinate generation x_n = x₁ + (n-1)×aₓ; validation for bounds and strictly increasing sequences. Updated architecture docs. |
| 2026-03-02 | Added "📋 Load Preset…" dropdown in `aam.html`/`aam.js`: embeds Surface Code X and Z stabilizer examples; selecting one instantly populates all params. Refactored load logic into shared `applyParamData()`. |
| 2026-03-02 | Added "💾 Save to File" button in `aam.html`/`aam.js`: exports current UI parameters (scalars + occupation grid + motion matrix) as a downloadable `aam-params.json`. |
| 2026-03-02 | Visual fix in `aam.js`: empty dynamic lattice sites now have transparent fill (only stroke outline visible). |
| 2026-03-02 | Created `visualization/aam.html` + `visualization/aam.js`: full HTML+JS visualization of AAM per `visualization/aam.md`. Includes parameter input UI (lattice sizes, occupation grid, motion matrix), canvas animation with 4-sub-step motion, pickup/offload physics, play/pause/step/reset controls. Default example: 5×5 static, 2×2 AOD, T=2 motion. |
| 2026-03-02 | Composed README.md for the project. |
| 2026-03-02 | GitHub Pages prep: created root `index.html` redirect. Load-from-File feature: added "📂 Load from File" button, `loadFromFile()` in aam.js, `visualization/example.json` sample, README docs. |
