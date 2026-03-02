# Agent Log

## Session 2026-03-02 (session 2)

### Feature: "Save to File" button

Added `saveToFile()` in `aam.js` and a "💾 Save to File" button in `aam.html` (next to the existing Load button). Clicking it downloads current UI parameters as `aam-params.json` in the same format as `example.json` (scalars + occupation grid row-major top-first + motion matrix).

**Files changed:** `visualization/aam.js`, `visualization/aam.html`

### Visual fix: transparent empty dynamic lattice sites

Changed `C_DYN_EMPTY_FILL` from `'#fff5f0'` to `'transparent'` in `aam.js`. Empty dynamic lattice sites now show only their stroke outline with no fill, making the background visible through them.

**Files changed:** `visualization/aam.js`
**Instruction todo marked done:** "Make the empty dynamic lattice fill transparent rather than now with a light color."

## Session 2026-03-02 (follow-up)

### Bug fix + 2 features in `visualization/aam.js`

**Bug fixed:** In `startSubStep`, `S.startX/Y` was assigned *after* `computeSubStepTargets`, so the "unchanged" dimension (e.g., y in sub-step 2) used stale values. Fixed by moving the assignment before the call.

**Feature 1 – Pause between moves:** After all 4 sub-steps of move(t) complete during Play, an inter-move pause (≥ 300ms, ≈ sub-step duration) is inserted via `schedulePause()` before move(t+1) begins. The pause is cancellable by the Pause button.

**Feature 2 – Animated Step:** The Step button now triggers a smooth animation for each sub-step instead of snapping instantly. After animation completes, simulation pauses, ready for the next Step click. Introduced `onSubStepComplete()` to unify state-advance logic for both Play and Step modes.
### Task: Implement AAM Visualization (HTML+JS)

**Source:** `agent-instruction.md` todo: "Follow the `visualization/aam.md`, implement a html+js realization."

**Files created:**
- `visualization/aam.html` — Two-panel browser UI with parameter input zone and canvas animation zone
- `visualization/aam.js` — Full simulation and animation logic

**Implementation summary:**

*Parameter input zone (HTML):*
- Inputs for Nx, Ny (static lattice size), dx, dy (dynamic lattice size), T (motion steps), δ (back-and parameter)
- Interactive Nx×Ny clickable occupation grid for setting os(x,y) initial state
- Editable (T+1)×(dx+dy) motion matrix table for M(dx,dy,T) — first dx columns = x-coords, last dy = y-coords
- "Rebuild Inputs" button to regenerate grid/matrix when dimension params change

*Animation zone (canvas):*
- Static lattice: Nx×Ny circles; outline=empty, filled blue=occupied
- Dynamic lattice: dx×dy circles at current AOD positions; orange=occupied, outline=empty
- Coordinate system: y=1 at bottom, y=Ny at top (natural orientation)
- Axis labels rendered alongside lattice

*Physics implementation:*
- **Pickup (before motion):** od(i,j) = os(x_i(0), y_j(0)); os(x_i(0), y_j(0)) = 0
- **4 sub-steps per motion step t → t+1:**
  1. All sites to (x_i(t)−0.5, y_j(t)−0.5) [avoid static sites during diagonal move]
  2. Columns to (x_i(t+1)−0.5, same_y) [x-movement]
  3. Rows to (same_x, y_j(t+1)) [y-movement]
  4. Right to (x_i(t+1)−δ, y_j(t+1)) if t+1<T, else (x_i(T), y_j(T)) [park/land]
- **Offload (after move T):** Check os(x_i(T),y_j(T))·od(i,j)=0 for all (i,j); if ok, deposit atoms; display result
- Validation enforces strictly increasing x and y sequences in M for each t

*Animation controls:*
- Play/Pause: smooth requestAnimationFrame tweening
- Step: instant-advance one sub-step at a time
- Reset: restart from initial state (re-runs pickup)
- Speed slider: 100–2000ms per sub-step

*Default example loaded:* 5×5 static lattice, 2×2 dynamic (dx=dy=2), T=2, M=[[1,3,1,3],[2,4,2,4],[1,3,1,3]]

## Session 2026-03-02 (GitHub Pages + Load from File)

### GitHub Pages preparation

- Created `index.html` at repo root with `<meta http-equiv="refresh">` + JS redirect to `visualization/aam.html`.
- Updated `README.md`: added live demo link (`itpyi.github.io/AtomISA`).
- Note: enabling Pages in GitHub repo settings (Settings → Pages → Source: `main`, `/`) is a manual one-time step.

### Feature: Load Parameters from File

- Added **"📂 Load from File"** button + hidden `<input type="file" accept=".json">` to the Lattice Parameters section of `aam.html`.
- Implemented `loadFromFile()` in `aam.js`: reads JSON, validates required numeric fields, sets scalar params, calls `rebuildInputs()`, then fills the occupation grid and motion matrix from `occupation` and `motion` arrays.
- JSON format: `{ Nx, Ny, dx, dy, T, delta, occupation[][], motion[][] }` — `occupation[row][col]` with row 0 = top (y=Ny); `motion[t]` = first dx x-coords then dy y-coords.
- Created `visualization/example.json` as a ready-to-use sample file.
- Documented file format and button in `README.md`.
- Updated `agent-instruction.md`: marked GitHub Pages todo done, added Load-from-File section.
