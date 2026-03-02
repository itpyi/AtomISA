# AtomISA — AOD Atom Motion Visualization

A browser-based interactive simulator for **AOD Atom Motion (AAM)**, a model of atom rearrangement in neutral-atom quantum computing platforms.

## Background

In neutral-atom quantum computers, atoms are trapped in two kinds of optical lattices:

| Lattice | Physical device | Role |
|---------|----------------|------|
| **Static lattice** (N_x × N_y) | SLM (Spatial Light Modulator) | Fixed trapping sites |
| **Dynamic lattice** (d_x × d_y) | AOD (Acousto-Optic Deflector) | Movable sublattice that transports atoms |

A **motion cycle** M(d_x, d_y, T) is a sequence of T+1 position snapshots for the dynamic lattice, encoded as a (T+1) × (d_x + d_y) matrix. The first d_x columns give the x-indices of each AOD column at each time step; the last d_y columns give the y-indices of each row. All x- and y-index sequences must be strictly increasing at every time step.

### What the simulator shows

1. **Pickup** — Before motion begins, each dynamic lattice site (i, j) picks up the atom (if any) at static site (x_i(0), y_j(0)), vacating that static site.
2. **Motion** — The dynamic lattice travels through T steps. Each step is decomposed into four sub-steps:
   - **1.** All sites move diagonally to (x_i(t) − ½, y_j(t) − ½) — clears static sites during travel.
   - **2.** Each *column* independently moves along x to x_i(t+1) − ½.
   - **3.** Each *row* independently moves along y to y_j(t+1).
   - **4.** All sites shift right to (x_i(t+1) − δ, y_j(t+1)) — parked position. At the final step T, δ is zeroed so sites land exactly on the target static positions.
3. **Offload** — At t = T, the simulator checks the *offload condition*: no static atom occupies a target site that the dynamic lattice wants to deposit into. If satisfied, atoms are transferred and the run succeeds; otherwise a collision is reported.

## Files

```
AtomISA/
├── README.md
├── agent-instruction.md      # AI-agent maintenance instructions
├── agent-log.md              # Full session activity log
├── agent-log-brief.md        # Brief summary log
├── architecture/
│   └── aam.md                # Formal mathematical specification of AAM
└── visualization/
    ├── aam.md                # Visualization design specification
    ├── aam.html              # Main HTML file — open this in a browser
    └── aam.js                # Simulation logic and canvas renderer
```

## Usage

Open `visualization/aam.html` in any modern browser — no build step or server required.

### Parameter input (left panel)

| Input | Description |
|-------|-------------|
| **N_x, N_y** | Static lattice dimensions |
| **d_x, d_y** | Dynamic (AOD) lattice dimensions |
| **T** | Number of motion steps |
| **δ** | Back-and-parameter (parking offset; typically 0.05–0.2) |
| **Static occupation grid** | Click cells to toggle which static sites are initially occupied (blue = occupied) |
| **Motion matrix** | Editable table of size (T+1) × (d_x + d_y). Purple columns = x-coordinates; amber columns = y-coordinates |

After editing parameters, click **Rebuild Inputs** to regenerate the grid and matrix, then click **Initialize** to set up the simulation.

### Controls

| Button | Action |
|--------|--------|
| **Rebuild Inputs** | Regenerate the occupation grid and motion matrix for the current parameter values |
| **Initialize** | Validate all inputs, execute pickup, and draw the initial state |
| **▶ Play** | Run the full animation continuously; click again to pause |
| **Step move →** | Animate one complete move(t) (all 4 sub-steps), then pause |
| **Reset** | Return to the initial state after pickup |
| **Speed slider** | Control animation speed (100 ms/sub-step = fast, 2000 ms = slow) |

### Colour coding

| Colour | Meaning |
|--------|---------|
| Grey outline circle | Static lattice site, empty |
| Blue filled circle | Static lattice site, occupied |
| Orange outline circle | AOD site, empty |
| Orange filled circle | AOD site, carrying an atom |
| Green highlight (end) | Offload successful |
| Red highlight (end) | Offload failed — collision |

### Default example

The page loads with a 5 × 5 static lattice, a 2 × 2 AOD sublattice, T = 2 motion steps, and the non-uniform motion matrix:

```
t=0:  x=[1,3]  y=[1,3]
t=1:  x=[2,5]  y=[2,4]
t=2:  x=[1,3]  y=[1,4]
```

## Architecture / Formal model

See [`architecture/aam.md`](architecture/aam.md) for the full mathematical definition, including the entangling-gate condition (CZ gate applied when a static atom and a dynamic atom co-occupy the same site during motion).

## Development notes

- Pure HTML + JavaScript, no dependencies.
- All physics and animation live in `visualization/aam.js` (~750 lines).
- AI-agent maintenance workflow is documented in `agent-instruction.md`.
