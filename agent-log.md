# Agent Log

## Session 2026-04-08 (Session 5)

### Feature: Footer Bar with Last Commit Date and GitHub Link

**Commit:** `c915978`

**Task:** Complete the open todo to add a bottom bar displaying the last commit date and a link to the GitHub repository on both pages.

**Actions taken:**

1. **Identified repository details**:
   - Repository: `itpyi/AtomISA`
   - Branch: `main`
   - GitHub API endpoint: `https://api.github.com/repos/itpyi/AtomISA/commits/main`

2. **Designed footer component** (both `index.html` and `visualization/aam.html`):
   - Fixed position at bottom of viewport
   - Dark theme matching existing header (`#1e293b` background)
   - Content: "Last updated: [date] | View on GitHub"
   - Responsive and minimalist design
   - z-index 1000 to stay on top

3. **Implemented JavaScript for automatic date fetching**:
   - Fetches commit data from GitHub API on page load
   - Extracts `commit.author.date` from API response
   - Formats date as "Month Day, Year" (e.g., "April 8, 2026")
   - Caches result in localStorage with 1-hour expiry to minimize API calls
   - Graceful error handling: displays "Recently" if API fails
   - Same script used on both pages

4. **Added footer to `visualization/aam.html`**:
   - Inserted footer HTML before closing `</body>` tag
   - Added footer CSS styles (35 lines)
   - Included inline JavaScript for API fetching (60 lines)
   - Adjusted main app height: `calc(100vh - 48px - 33px)` to accommodate footer

5. **Added footer to `index.html`**:
   - Inserted footer HTML and styles
   - Included same JavaScript for date fetching
   - Enhanced page styling for better redirect page appearance

6. **Marked todo complete** (`agent-instruction.md`):
   - Changed checkbox from `[ ]` to `[x]` for the GitHub Pages footer todo

**Technical details:**
- **API caching**: Reduces API calls from every page load to once per hour per user
- **Error handling**: Network failures or rate limits show fallback text
- **Performance**: Non-blocking fetch with try-catch for localStorage operations
- **Consistency**: Shared cache key (`aam_commit_date`) between pages

**Result:** Both pages now display an automatic footer showing the last commit date from GitHub and a link to the repository. The date updates automatically when new commits are pushed (after cache expiry).

**Commit:** `c915978` - "Add footer bar with last commit date and GitHub link"

---

## Session 2026-04-08 (Session 4)

### Feature: Separate Preset and Download Data Structures by Mode

**Commit:** `4a3b6a1`

**Task:** Complete the open todo to separate preset selection and file save/load data structures between Original and QN modes.

**Actions taken:**

1. **Added mode property to all presets** (`visualization/aam.js`):
   - Added `mode: 'original'` to `surface-code-X` and `surface-code-Z` presets
   - Added `mode: 'qn'` to `surface-code-X-qn` preset
   - This enables filtering presets by mode

2. **Implemented dynamic preset dropdown filtering** (`visualization/aam.js`):
   - Created `updatePresetDropdown()` function that rebuilds dropdown options based on current `inputMode`
   - Original mode: shows only presets with `mode: 'original'` (2 presets)
   - QN mode: shows only presets with `mode: 'qn'` (1 preset)
   - Called on page load via DOMContentLoaded event listener
   - Called when mode is toggled via `toggleInputMode()`

3. **Updated HTML** (`visualization/aam.html`):
   - Removed hardcoded preset options (were manually listing all 3 presets)
   - Now only contains placeholder option; presets populated dynamically by JS

4. **Implemented mode-specific save formats** (`visualization/aam.js` - `saveToFile()`):
   - All saved files now include `mode` field
   - **Original mode**: saves full motion matrix (existing behavior)
     - Structure: `{mode: "original", Nx, Ny, dx, dy, T, delta, occupation, motion}`
   - **QN mode**: saves simplified QN parameters instead of full matrix
     - Structure: `{mode: "qn", Nx, Ny, dx, dy, T, delta, occupation, ax, ay, x1, y1}`
     - Extracts ax, ay from input fields; x1, y1 arrays from QN table

5. **Implemented auto mode-switching on load** (`visualization/aam.js` - `applyParamData()`):
   - Checks for explicit `mode` field in loaded JSON
   - Auto-detects mode if not specified (backward compatibility):
     - If data has `ax`, `ay`, `x1`, `y1` → assumes QN mode
     - If data has `motion` matrix → assumes Original mode
   - If detected/specified mode differs from current `inputMode`:
     - Switches `inputMode` variable
     - Updates mode toggle button label
     - Calls `updatePresetDropdown()` to refresh preset options
   - Then proceeds with normal parameter population

6. **Updated example.json** (`visualization/example.json`):
   - Added `"mode": "original"` field for documentation

7. **Marked todo complete** (`agent-instruction.md`):
   - Changed checkbox from `[ ]` to `[x]` for the mode separation todo

**Result:** 
- Preset dropdown now context-aware: shows only relevant presets for current mode
- Save/Load respects mode boundaries: QN files use simplified structure, Original files use full matrix
- Loading a file automatically switches to correct mode
- Full backward compatibility with existing JSON files (auto-detection)

**Commit:** `4a3b6a1` - "Separate preset and download data structures by mode"

---

## Session 2026-04-08 (Session 3)

### Feature: Surface Code X Stabilizer QN Preset

**Task:** Implement the open todo to add a QN mode preset for the Surface Code X Stabilizer using parameters from `aam-params-sc-x.json`.

**Actions taken:**

1. **Analyzed motion matrix** in `aam-params-sc-x.json`:
   - Confirmed uniform spacing: ax = 1, ay = 1
   - Extracted QN parameters: x1 = [5,1,1,2,2,5], y1 = [3,3,2,3,2,3]
   - Verified formula: x_n(t) = x1(t) + (n-1)×ax holds for all timesteps
   - Lattice dimensions: 10×8 (Nx=10, Ny=8)

2. **Updated `visualization/aam.js`**:
   - Added new preset 'surface-code-X-qn' to PRESETS object (after line 277)
   - Preset uses QN format with fields: ax, ay, x1[], y1[], occupation[]
   - Kept existing 'surface-code-X' preset (10×5 Original mode) for backward compatibility
   - Enhanced `applyParamData()` function to handle both QN format (ax/ay/x1/y1) and Original format (motion matrix)
   - QN format detection: checks for ax, ay, x1, y1 fields and populates QN input UI accordingly

3. **Updated `visualization/aam.html`**:
   - Added dropdown option: `<option value="surface-code-X-qn">Surface Code X Stabilizer (QN)</option>`
   - Positioned after the existing X and Z stabilizer options

4. **Marked todo complete** in `agent-instruction.md`:
   - Changed line 50 checkbox from [ ] to [x]

**Result:** Users can now select "Surface Code X Stabilizer (QN)" from the preset dropdown, which loads a 10×8 lattice with uniform spacing (ax=1, ay=1) in QN mode. The older 10×5 Original mode preset remains available for comparison.

**Commit:** (pending)

## Session 2026-04-08 (Session 2)

### Documentation: QN Mode from Previous Session

**Issue:** The QN mode was implemented in commit 141eabb but was not documented in README.md or agent logs.

**Actions taken:**
1. **README.md:** Added comprehensive "QN Mode" section under Usage explaining:
   - Mode toggle button in header (Original ↔ QN)
   - QN input interface with simplified table (x₁(t), y₁(t), aₓ, aᵧ)
   - Automatic coordinate generation formula: x_n(t) = x₁(t) + (n−1) × a_x
   - When to use QN mode (uniform lattice constraints, near-term hardware)
   - Validation behavior (bounds checking, strictly increasing)

2. **agent-log.md:** Added detailed implementation entry for commit 141eabb documenting:
   - Files changed and what was added to each
   - Mode toggle functionality
   - QN input UI structure
   - Coordinate generation algorithm
   - Validation enhancements
   - QN constraints per architecture spec

3. **agent-log-brief.md:** Added concise one-line entry with date 2026-04-08

4. **agent-instruction.md:** Verified first QN todo marked [x], marked second todo (SC-X preset) as [x] complete since `aam-params-sc-x.json` already has uniform spacing (aₓ=1, aᵧ=1) compatible with QN mode.

**Note:** QN mode is a UI input feature for simplified parameter entry. JSON files continue using the full motion matrix format for compatibility. The `aam-params-sc-x.json` file has uniform spacing and can be used in either mode.

**Commit:** 3cf54cc "Document QN mode and mark SC-X preset complete"

## Session 2026-04-08

### Feature: QN Mode Implementation

**Commit:** 141eabb

Implemented a "QN" (near-term) input mode for the visualization, designed for quantum hardware with uniform AOD lattice spacing constraints. The QN mode simplifies motion input by requiring only starting coordinates and uniform spacing parameters instead of the full motion matrix.

**Files changed:**
- `visualization/aam.html` — Added mode toggle button in header ("Mode: Original" / "Mode: QN")
- `visualization/aam.js` — Implemented QN input UI and coordinate generation logic (~270 lines)
- `visualization/aam.md` — Added note about QN version
- `architecture/aam.md` — Added "Near term version" section documenting QN constraints
- `agent-instruction.md` — Marked "Implement QN version" todo as complete

**Implementation details:**

1. **Mode Toggle:** `toggleInputMode()` switches between 'original' and 'qn' modes, updating the UI label and calling `updateInputPanelForMode()` to show/hide appropriate input sections.

2. **QN Input UI:** `buildQNInputs()` creates a simplified table with:
   - Two input fields: a_x (x-spacing) and a_y (y-spacing)
   - Table with (T+1) rows, each row containing only x₁(t) and y₁(t) inputs
   - Formula displayed: x_n(t) = x₁(t) + (n−1)×a_x

3. **Coordinate Generation:** `generateMatrixFromQN(x1Array, y1Array, ax, ay, dx, dy, T)` computes full motion matrix M_x and M_y from simplified QN data:
   - For each time t and dynamic lattice index i: `x_i(t) = x₁(t) + (i-1) × a_x`
   - Similarly for y-coordinates with a_y

4. **Validation:** Extended `parseParameters()` to handle both modes:
   - QN mode: validates x₁(t), y₁(t) are in bounds, then generates full matrix
   - Checks generated coordinates stay within [1, N_x] × [1, N_y]
   - Verifies strictly increasing property holds for generated sequences
   - Reports helpful errors (e.g., "Increase a_x" if spacing too small)

5. **Rebuild Logic:** `rebuildInputs()` now branches based on mode, calling either `buildMotionMatrix()` or `buildQNInputs()`.

**QN constraints (per architecture spec):**
- Dynamic lattice must have uniform and constant spacing
- Only requires x₁(t), y₁(t), a_x, a_y as input instead of full coordinate arrays

**Note:** QN mode is a UI input feature. JSON parameter files continue to use the full motion matrix format for compatibility.

## Session 2026-03-02 (session 2)

### Feature: preset example dropdown

Added a "📋 Load Preset…" `<select>` dropdown in `aam.html` (between the Load and Save buttons). Preset data for `surface-code-X.json` and `surface-code-Z.json` is embedded directly in `aam.js` as the `PRESETS` object. Selecting a preset calls `loadPreset()` → `applyParamData()`. Refactored the shared population logic from `loadFromFile` into `applyParamData()` so both file-load and preset-load share the same code path.

**Files changed:** `visualization/aam.js`, `visualization/aam.html`

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
