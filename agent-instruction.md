Instructions for agent
======================

## General rule

- This file is intended for instructing AI agents to maintain this project.
- This file is structured by the logic of the project itself. In each section, there is a "Description" subsection and a "Todo" subsection. The Description is for a general description. The Todo is a todo list for AI agents to read. After finishing, the agent should mark the item.
- The AI agent should maintain a `agent-log.md` and `agent-log-brief.md`. After each execution, the agent should write done briefly what it has done in the log.
- Human modification should also be documented in the `agent-log.md`. Human maintainer will tell AI agent to do so explicitly after modifying. But this information will not be documented in this instruction file, so this file is not a complete source for what has been done.
- AI agent should maintain a `agent-log-brief.md` for a much briefer version of the `agent-log.md`. Explicit instruction will be given for update it from `agent-log.md`. AI agent can also update it automatically when necessary.
- One a new session is turned on, the agent should refer to the `agent-log-brief.md` to understand what has been done in this project, for particularly important details, it can further refer to the `agent-log.md`.
- **Git commits**: commit once per logical task completion (a finished todo item, a self-contained fix) — not per file and not mid-task. 

## Visualization of atom motion

- [x] Follow the `visualization/aam.md`, implement a html+js realization.
- [x] It seems that the behaviour is not as expected in the moves. Make sure that in the 4 step move, the 2 only move along x directions, keeping the y-axis unchanged; the 3 only along y-directions, keeping the x-axis unchanged; the 4 only x-direction. Finally the dynamic
  lattice site (i,j) should be at (x(t+1)_i - delta, y(t+1)_j), and if t+1 = T, the delta shift is zeroed. 
- [x] Add a pause after each move (t).
- [x] The step is also realized by an animated move.
- [x] Make the default example a non-uniform moving, like [[1,3,1,3],[2,5,2,4],[1,3,1,4]].
- [x] Make the step button a large move (t) instead of 4 separate substeps.


## GitHub Pages

- [x] Prepare for publishing using GitHub Pages.
  - Created `index.html` at repo root (redirects to `visualization/aam.html`).
  - To activate: repo Settings → Pages → Source: `main`, folder `/`.

## Load Parameters from File

### Description

Users can load all simulation parameters from a `.json` file via a "📂 Load from File"
button in the UI. The file format is documented in `README.md` and a sample is at
`visualization/example.json`.

### Todo

- [ ] (optional) Add a "Save to File" button that exports current parameters as JSON.