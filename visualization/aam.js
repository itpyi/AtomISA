// aam.js – AAM (AOD Atom Motion) Visualization
// Implements the visualization spec in visualization/aam.md
// and the physics defined in architecture/aam.md

// =============================================================================
// CONSTANTS
// =============================================================================
const CELL_SIZE   = 50;   // pixels per lattice unit
const PADDING     = 60;   // canvas padding in pixels
const R_STATIC    = 4;   // radius of static lattice circles
const R_DYNAMIC   = 5;   // radius of dynamic lattice circles

// Colors
const C_STATIC_EMPTY    = '#fff';
const C_STATIC_STROKE   = '#94a3b8';
const C_STATIC_FILLED   = '#1d4ed8';
const C_STATIC_FILL_STR = '#1e40af';
const C_DYN_STROKE      = '#ea580c';
const C_DYN_EMPTY_FILL  = 'transparent';
const C_DYN_FILLED      = '#f97316';
const C_BG              = '#f8fafc';
const C_GRID            = '#e8edf2';

// =============================================================================
// GLOBAL STATE
// =============================================================================
let P = null;           // parsed parameters
let S = null;           // simulation state
let animId = null;      // rAF id
let stepPauseTimer = null; // inter-move pause timer id
let isPlaying = false;
let moveStepping = false;  // true when Step is animating a full move(t)
let subStepDuration = 500; // ms per animation sub-step
let inputMode = 'original'; // 'original' or 'qn'

// Sub-step labels for UI
const SUB_STEP_LABELS = [
  'sub-step 1: move to (x(t)−½, y(t)−½)',
  'sub-step 2: columns → x(t+1)−½',
  'sub-step 3: rows → y(t+1)',
  'sub-step 4: move right to final position',
];

// =============================================================================
// DOM HELPERS
// =============================================================================
const $ = id => document.getElementById(id);

function setStatus(msg, cls = '') {
  const el = $('status-bar');
  el.textContent = msg;
  el.className = cls;
}

function setPhase(msg) {
  $('phase-indicator').textContent = 'Phase: ' + msg;
}

// =============================================================================
// UI SETUP – OCCUPATION GRID
// =============================================================================
function buildOccupationGrid() {
  const Nx = parseInt($('param-Nx').value);
  const Ny = parseInt($('param-Ny').value);
  const grid = $('occ-grid');
  grid.innerHTML = '';
  grid.style.gridTemplateColumns = `repeat(${Nx}, 26px)`;
  grid.style.gridTemplateRows    = `repeat(${Ny}, 26px)`;

  // Row 0 in the HTML = y=Ny in lattice coords (top of grid)
  for (let row = Ny; row >= 1; row--) {
    for (let col = 1; col <= Nx; col++) {
      const cell = document.createElement('div');
      cell.className = 'occ-cell';
      cell.dataset.x = col;
      cell.dataset.y = row;
      cell.title = `(${col}, ${row})`;
      cell.addEventListener('click', () => {
        cell.classList.toggle('filled');
      });
      grid.appendChild(cell);
    }
  }
}

function getOccupationMatrix() {
  const Nx = parseInt($('param-Nx').value);
  const Ny = parseInt($('param-Ny').value);
  // os[x-1][y-1], 0-indexed internally
  const os = Array.from({length: Nx}, () => new Array(Ny).fill(0));
  $('occ-grid').querySelectorAll('.occ-cell').forEach(cell => {
    if (cell.classList.contains('filled')) {
      const x = parseInt(cell.dataset.x) - 1;
      const y = parseInt(cell.dataset.y) - 1;
      os[x][y] = 1;
    }
  });
  return os;
}

// =============================================================================
// UI SETUP – MOTION MATRIX
// =============================================================================
function buildMotionMatrix() {
  const dx = parseInt($('param-dx').value);
  const dy = parseInt($('param-dy').value);
  const T  = parseInt($('param-T').value);
  const Nx = parseInt($('param-Nx').value);
  const Ny = parseInt($('param-Ny').value);

  const table = $('motion-matrix');
  table.innerHTML = '';

  // Header row
  const thead = table.createTHead();
  const hrow  = thead.insertRow();
  const th0   = document.createElement('th');
  th0.textContent = 't';
  hrow.appendChild(th0);
  for (let i = 1; i <= dx; i++) {
    const th = document.createElement('th');
    th.className = 'x-header';
    th.textContent = `x${i}`;
    hrow.appendChild(th);
  }
  for (let j = 1; j <= dy; j++) {
    const th = document.createElement('th');
    th.className = 'y-header';
    th.textContent = `y${j}`;
    hrow.appendChild(th);
  }

  // Body rows: t = 0 .. T
  const tbody = table.createTBody();
  for (let t = 0; t <= T; t++) {
    const row = tbody.insertRow();
    const labelCell = row.insertCell();
    labelCell.className = 't-label';
    labelCell.textContent = `t=${t}`;

    // x columns: default equally spaced in [1, Nx]
    for (let i = 0; i < dx; i++) {
      const cell = row.insertCell();
      cell.className = 'x-col';
      const inp = document.createElement('input');
      inp.type = 'number';
      inp.min = 1;
      inp.max = Nx;
      inp.step = 1;
      inp.value = clamp(i + 1, 1, Nx);
      cell.appendChild(inp);
    }
    // y columns: default equally spaced in [1, Ny]
    for (let j = 0; j < dy; j++) {
      const cell = row.insertCell();
      cell.className = 'y-col';
      const inp = document.createElement('input');
      inp.type = 'number';
      inp.min = 1;
      inp.max = Ny;
      inp.step = 1;
      inp.value = clamp(j + 1, 1, Ny);
      cell.appendChild(inp);
    }
  }
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

// Rebuild both the grid and the matrix when params change
function rebuildInputs() {
  buildOccupationGrid();
  
  if (inputMode === 'original') {
    buildMotionMatrix();
  } else {
    buildQNInputs();
  }
  
  setStatus('Inputs rebuilt. Adjust values then click Initialize.');
  setPhase('idle');
  disableControls();
  S = null;
  P = null;
  if (animId) { cancelAnimationFrame(animId); animId = null; }
  if (stepPauseTimer) { clearTimeout(stepPauseTimer); stepPauseTimer = null; }
  isPlaying = false;
  clearCanvas();
}

// =============================================================================
// LOAD PARAMETERS FROM JSON FILE / PRESET
// =============================================================================

// Shared: populate UI from a parsed data object
function applyParamData(data, label) {
  const required = ['Nx','Ny','dx','dy','T','delta'];
  for (const key of required) {
    if (typeof data[key] !== 'number') {
      setStatus(`Error: missing or invalid field "${key}" in ${label}.`, 'error');
      return;
    }
  }
  
  // Check if mode switching is needed
  let targetMode = data.mode; // explicit mode in data
  
  // Auto-detect mode if not specified (backward compatibility)
  if (!targetMode) {
    if (typeof data.ax === 'number' && typeof data.ay === 'number' && 
        Array.isArray(data.x1) && Array.isArray(data.y1)) {
      targetMode = 'qn';
    } else if (Array.isArray(data.motion)) {
      targetMode = 'original';
    }
  }
  
  // Switch mode if needed
  if (targetMode && targetMode !== inputMode) {
    inputMode = targetMode;
    $('mode-label').textContent = inputMode === 'original' ? 'Original' : 'QN';
    updatePresetDropdown(); // Update dropdown for new mode
  }
  
  $('param-Nx').value    = data.Nx;
  $('param-Ny').value    = data.Ny;
  $('param-dx').value    = data.dx;
  $('param-dy').value    = data.dy;
  $('param-T').value     = data.T;
  $('param-delta').value = data.delta;

  rebuildInputs();

  if (Array.isArray(data.occupation)) {
    const cells = $('occ-grid').querySelectorAll('.occ-cell');
    cells.forEach(cell => {
      const col = parseInt(cell.dataset.x) - 1;
      const row = data.Ny - parseInt(cell.dataset.y);
      const rowArr = data.occupation[row];
      if (Array.isArray(rowArr) && rowArr[col] === 1) cell.classList.add('filled');
      else cell.classList.remove('filled');
    });
  }

  // Handle QN format (ax, ay, x1, y1 arrays)
  if (typeof data.ax === 'number' && typeof data.ay === 'number' && 
      Array.isArray(data.x1) && Array.isArray(data.y1)) {
    // Populate QN inputs
    const axInput = $('qn-ax');
    const ayInput = $('qn-ay');
    if (axInput) axInput.value = data.ax;
    if (ayInput) ayInput.value = data.ay;
    
    const qnTable = $('qn-motion-table');
    if (qnTable && qnTable.tBodies[0]) {
      const rows = qnTable.tBodies[0].rows;
      for (let t = 0; t < rows.length && t < data.x1.length && t < data.y1.length; t++) {
        const inputs = rows[t].querySelectorAll('input');
        if (inputs.length >= 2) {
          inputs[0].value = data.x1[t]; // x1(t)
          inputs[1].value = data.y1[t]; // y1(t)
        }
      }
    }
  }
  // Handle Original format (full motion matrix)
  else if (Array.isArray(data.motion)) {
    const rows = $('motion-matrix').tBodies[0].rows;
    for (let t = 0; t < rows.length; t++) {
      const rowData = data.motion[t];
      if (!Array.isArray(rowData)) continue;
      const inputs = rows[t].querySelectorAll('input');
      for (let k = 0; k < inputs.length && k < rowData.length; k++) inputs[k].value = rowData[k];
    }
  }

  setStatus(`Loaded "${label}". Adjust if needed, then click Initialize.`, 'info');
}

const PRESETS = {
  'surface-code-X': {
    _label: 'Surface Code X Stabilizer',
    mode: 'original',
    Nx: 10, Ny: 5, dx: 4, dy: 2, T: 5, delta: 0.2,
    occupation: [
      [0,0,0,0,0,0,0,0,0,1],
      [0,1,1,1,1,0,1,0,1,0],
      [0,1,1,1,0,1,0,1,0,1],
      [0,1,1,1,0,0,0,0,1,0],
      [0,0,0,0,0,0,0,0,0,0]
    ],
    motion: [
      [5,6,7,8,3,4],
      [1,2,3,4,3,4],
      [1,2,3,4,2,3],
      [2,3,4,5,3,4],
      [2,3,4,5,2,3],
      [5,6,7,8,3,4]
    ]
  },
  'surface-code-Z': {
    _label: 'Surface Code Z Stabilizer',
    mode: 'original',
    Nx: 10, Ny: 5, dx: 2, dy: 4, T: 5, delta: 0.2,
    occupation: [
      [0,0,0,0,0,0,0,0,0,1],
      [0,1,1,1,1,0,1,0,1,0],
      [0,1,1,1,0,1,0,1,0,1],
      [0,1,1,1,0,0,0,0,1,0],
      [0,0,0,0,0,0,0,0,0,0]
    ],
    motion: [
      [9,10,2,3,4,5],
      [2,3,2,3,4,5],
      [3,4,2,3,4,5],
      [2,3,1,2,3,4],
      [3,4,1,2,3,4],
      [9,10,2,3,4,5]
    ]
  },
  'surface-code-X-qn': {
    _label: 'Surface Code X Stabilizer (QN)',
    mode: 'qn',
    Nx: 10, Ny: 8, dx: 4, dy: 2, T: 5, delta: 0.2,
    ax: 1, ay: 1,
    x1: [5, 1, 1, 2, 2, 2],
    y1: [3, 3, 2, 3, 2, 6],
    occupation: [
      [0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0],
      [0,1,1,1,1,0,1,0,0,1],
      [0,1,1,1,0,1,0,1,1,0],
      [0,1,1,1,0,0,0,0,0,1],
      [0,0,0,0,0,0,0,0,1,0]
    ]
  }
};

function updatePresetDropdown() {
  const sel = $('preset-select');
  if (!sel) return;
  
  // Clear existing options except placeholder
  sel.innerHTML = '<option value="">📋 Load Preset…</option>';
  
  // Add presets that match current mode
  for (const [key, preset] of Object.entries(PRESETS)) {
    if (preset.mode === inputMode) {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = preset._label;
      sel.appendChild(opt);
    }
  }
}

function loadPreset(sel) {
  const key = sel.value;
  sel.value = ''; // reset to placeholder
  if (!key || !PRESETS[key]) return;
  applyParamData(PRESETS[key], PRESETS[key]._label);
}

function loadFromFile(input) {
  const file = input.files[0];
  if (!file) return;
  input.value = '';
  const reader = new FileReader();
  reader.onload = function(e) {
    let data;
    try {
      data = JSON.parse(e.target.result);
    } catch (err) {
      setStatus('Error: could not parse JSON file — ' + err.message, 'error');
      return;
    }
    applyParamData(data, file.name);
  };
  reader.readAsText(file);
}

function saveToFile() {
  const Nx    = parseInt($('param-Nx').value);
  const Ny    = parseInt($('param-Ny').value);
  const dx    = parseInt($('param-dx').value);
  const dy    = parseInt($('param-dy').value);
  const T     = parseInt($('param-T').value);
  const delta = parseFloat($('param-delta').value);

  // occupation: row 0 = top (y=Ny), row-major
  const osRaw = getOccupationMatrix(); // osRaw[x-1][y-1]
  const occupation = [];
  for (let row = 0; row < Ny; row++) {
    const y = Ny - 1 - row; // y index (0-based), top row first
    const rowArr = [];
    for (let x = 0; x < Nx; x++) rowArr.push(osRaw[x][y]);
    occupation.push(rowArr);
  }

  let data = { mode: inputMode, Nx, Ny, dx, dy, T, delta, occupation };
  
  if (inputMode === 'original') {
    // Save full motion matrix for Original mode
    const motion = [];
    const rows = $('motion-matrix').tBodies[0].rows;
    for (let t = 0; t < rows.length; t++) {
      const inputs = rows[t].querySelectorAll('input');
      motion.push(Array.from(inputs, inp => parseInt(inp.value)));
    }
    data.motion = motion;
  } else {
    // Save QN format: ax, ay, x1[], y1[]
    const ax = parseInt($('qn-ax').value);
    const ay = parseInt($('qn-ay').value);
    const x1 = [];
    const y1 = [];
    
    const qnTable = $('qn-motion-table');
    if (qnTable && qnTable.tBodies[0]) {
      const rows = qnTable.tBodies[0].rows;
      for (let t = 0; t < rows.length; t++) {
        const inputs = rows[t].querySelectorAll('input');
        if (inputs.length >= 2) {
          x1.push(parseInt(inputs[0].value));
          y1.push(parseInt(inputs[1].value));
        }
      }
    }
    
    data.ax = ax;
    data.ay = ay;
    data.x1 = x1;
    data.y1 = y1;
  }

  const a = document.createElement('a');
  a.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
  a.download = 'aam-params.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// =============================================================================
// PARAMETER PARSING & VALIDATION
// =============================================================================

function generateMatrixFromQN(x1Array, y1Array, ax, ay, dx, dy, T) {
  // Generate full motion matrix from QN simplified data
  // x_n(t) = x_1(t) + (n-1) * ax
  // y_m(t) = y_1(t) + (m-1) * ay
  
  const M_x = []; // M_x[t][i] = x-coord of column i at time t (1-indexed lattice)
  const M_y = []; // M_y[t][j] = y-coord of row j at time t
  
  for (let t = 0; t <= T; t++) {
    const xs = [];
    for (let i = 0; i < dx; i++) {
      xs.push(x1Array[t] + i * ax);
    }
    
    const ys = [];
    for (let j = 0; j < dy; j++) {
      ys.push(y1Array[t] + j * ay);
    }
    
    M_x.push(xs);
    M_y.push(ys);
  }
  
  return { M_x, M_y };
}

function parseParameters() {
  const Nx    = parseInt($('param-Nx').value);
  const Ny    = parseInt($('param-Ny').value);
  const dx    = parseInt($('param-dx').value);
  const dy    = parseInt($('param-dy').value);
  const T     = parseInt($('param-T').value);
  const delta = parseFloat($('param-delta').value);

  if (dx > Nx) return { err: `dx (${dx}) must be ≤ Nx (${Nx})` };
  if (dy > Ny) return { err: `dy (${dy}) must be ≤ Ny (${Ny})` };
  if (T < 1)   return { err: 'T must be ≥ 1' };

  let M_x, M_y;

  if (inputMode === 'qn') {
    // Parse QN mode inputs
    const ax = parseInt($('qn-ax').value);
    const ay = parseInt($('qn-ay').value);
    
    const qnTable = $('qn-motion-table');
    if (!qnTable || !qnTable.tBodies[0]) return { err: 'QN table not found. Rebuild inputs.' };
    const rows = qnTable.tBodies[0].rows;
    if (rows.length !== T + 1) return { err: 'QN table row count mismatch. Rebuild inputs.' };
    
    const x1Array = [];
    const y1Array = [];
    
    for (let t = 0; t <= T; t++) {
      const inputs = rows[t].querySelectorAll('input');
      if (inputs.length !== 2) return { err: `QN row t=${t} should have 2 inputs.` };
      
      const x1 = parseInt(inputs[0].value);
      const y1 = parseInt(inputs[1].value);
      
      if (isNaN(x1) || x1 < 1 || x1 > Nx) return { err: `x₁(${t})=${x1} out of range [1,${Nx}]` };
      if (isNaN(y1) || y1 < 1 || y1 > Ny) return { err: `y₁(${t})=${y1} out of range [1,${Ny}]` };
      
      x1Array.push(x1);
      y1Array.push(y1);
    }
    
    // Generate full matrix from QN data
    const result = generateMatrixFromQN(x1Array, y1Array, ax, ay, dx, dy, T);
    M_x = result.M_x;
    M_y = result.M_y;
    
    // Validate generated matrix
    for (let t = 0; t <= T; t++) {
      // Check bounds
      for (let i = 0; i < dx; i++) {
        if (M_x[t][i] < 1 || M_x[t][i] > Nx) {
          return { err: `Generated x${i+1}(${t})=${M_x[t][i]} out of range [1,${Nx}]. Adjust x₁(${t}) or aₓ.` };
        }
      }
      for (let j = 0; j < dy; j++) {
        if (M_y[t][j] < 1 || M_y[t][j] > Ny) {
          return { err: `Generated y${j+1}(${t})=${M_y[t][j]} out of range [1,${Ny}]. Adjust y₁(${t}) or aᵧ.` };
        }
      }
      
      // Check strictly increasing
      for (let i = 1; i < dx; i++) {
        if (M_x[t][i] <= M_x[t][i-1]) {
          return { err: `Generated x-coords at t=${t} not strictly increasing. Increase aₓ (currently ${ax}).` };
        }
      }
      for (let j = 1; j < dy; j++) {
        if (M_y[t][j] <= M_y[t][j-1]) {
          return { err: `Generated y-coords at t=${t} not strictly increasing. Increase aᵧ (currently ${ay}).` };
        }
      }
    }
    
  } else {
    // Parse original mode motion matrix
    const rows = $('motion-matrix').tBodies[0].rows;
    if (rows.length !== T + 1) return { err: 'Motion matrix row count mismatch. Rebuild inputs.' };

    M_x = []; // M_x[t][i] = x-coord of column i at time t (1-indexed lattice)
    M_y = []; // M_y[t][j] = y-coord of row j at time t

    for (let t = 0; t <= T; t++) {
      const inputs = rows[t].querySelectorAll('input');
      if (inputs.length !== dx + dy) return { err: `Matrix row t=${t} has wrong number of inputs.` };
      const xs = [], ys = [];
      for (let i = 0; i < dx; i++) {
        const v = parseInt(inputs[i].value);
        if (isNaN(v) || v < 1 || v > Nx) return { err: `M[${t}][x${i+1}]=${v} out of range [1,${Nx}]` };
        xs.push(v);
      }
      for (let j = 0; j < dy; j++) {
        const v = parseInt(inputs[dx + j].value);
        if (isNaN(v) || v < 1 || v > Ny) return { err: `M[${t}][y${j+1}]=${v} out of range [1,${Ny}]` };
        ys.push(v);
      }
      // Validate strictly increasing
      for (let i = 1; i < dx; i++)
        if (xs[i] <= xs[i-1]) return { err: `M[${t}]: x-coordinates must be strictly increasing (x${i+1} ≤ x${i})` };
      for (let j = 1; j < dy; j++)
        if (ys[j] <= ys[j-1]) return { err: `M[${t}]: y-coordinates must be strictly increasing (y${j+1} ≤ y${j})` };

      M_x.push(xs);
      M_y.push(ys);
    }
  }

  const osInit = getOccupationMatrix();

  return { params: { Nx, Ny, dx, dy, T, delta, M_x, M_y, osInit } };
}

// =============================================================================
// SIMULATION STATE
// =============================================================================
function initSim(p) {
  // os[x][y]: 0-indexed (x ∈ [0,Nx-1], y ∈ [0,Ny-1])
  const os = p.osInit.map(col => [...col]);

  // od[i][j]: 0-indexed (i ∈ [0,dx-1], j ∈ [0,dy-1])
  const od = Array.from({length: p.dx}, () => new Array(p.dy).fill(0));

  // Current fractional lattice positions
  const xPos = p.M_x[0].map(v => v); // columns 0..dx-1
  const yPos = p.M_y[0].map(v => v); // rows    0..dy-1

  return {
    os, od,
    xPos: [...xPos],
    yPos: [...yPos],
    phase: 'ready',      // ready | pickup | substep | offload_anim | done
    currentT: 0,         // current time step (0 to T-1)
    currentSubStep: 0,   // 0..3
    animStartTime: null,
    startX: [...xPos],
    startY: [...yPos],
    endX: [...xPos],
    endY: [...yPos],
    offloadSuccess: null,
    pickupHighlight: 0,  // for pickup animation frame counter
  };
}

// =============================================================================
// PICKUP LOGIC
// =============================================================================
function doPickup() {
  // od(i,j) = os(x_i(0), y_j(0)), os(x_i(0), y_j(0)) = 0
  for (let i = 0; i < P.dx; i++) {
    for (let j = 0; j < P.dy; j++) {
      const xi = P.M_x[0][i] - 1; // 0-indexed
      const yj = P.M_y[0][j] - 1;
      S.od[i][j] = S.os[xi][yj];
      S.os[xi][yj] = 0;
    }
  }
}

// =============================================================================
// OFFLOAD LOGIC
// =============================================================================
function doOffload() {
  // Check: for all (i,j), os(x_i(T), y_j(T)) * od(i,j) = 0
  let ok = true;
  for (let i = 0; i < P.dx && ok; i++) {
    for (let j = 0; j < P.dy && ok; j++) {
      const xi = P.M_x[P.T][i] - 1;
      const yj = P.M_y[P.T][j] - 1;
      if (S.os[xi][yj] === 1 && S.od[i][j] === 1) ok = false;
    }
  }
  S.offloadSuccess = ok;
  if (ok) {
    for (let i = 0; i < P.dx; i++) {
      for (let j = 0; j < P.dy; j++) {
        const xi = P.M_x[P.T][i] - 1;
        const yj = P.M_y[P.T][j] - 1;
        S.os[xi][yj] += S.od[i][j];
      }
    }
    // Clear dynamic lattice
    for (let i = 0; i < P.dx; i++)
      for (let j = 0; j < P.dy; j++)
        S.od[i][j] = 0;
  }
  S.phase = 'done';
  isPlaying = false;
  $('btn-play').textContent = '▶ Play';
  $('btn-play').disabled = true;
  $('btn-step').disabled = true;

  if (ok) {
    setStatus('✓ Offload successful! Atoms deposited at target positions.', 'success');
  } else {
    setStatus('✗ Offload failed: collision detected at target position.', 'error');
  }
  setPhase('done');
  render();
}

// =============================================================================
// SUB-STEP TARGET COMPUTATION
// =============================================================================
function computeSubStepTargets(t, subStep) {
  const delta = P.delta;
  let endX, endY;

  switch (subStep) {
    case 0:
      // Move all to (x_i(t) - 0.5, y_j(t) - 0.5)
      endX = P.M_x[t].map(x => x - 0.5);
      endY = P.M_y[t].map(y => y - 0.5);
      break;
    case 1:
      // Columns move to x_i(t+1) - 0.5, y unchanged
      endX = P.M_x[t + 1].map(x => x - 0.5);
      endY = [...S.startY];
      break;
    case 2:
      // Rows move to y_j(t+1), x unchanged
      endX = [...S.startX];
      endY = P.M_y[t + 1].map(y => y);
      break;
    case 3:
      // Move right to parked/final position
      const isLast = (t + 1 === P.T);
      if (isLast) {
        endX = P.M_x[P.T].map(x => x);
        endY = P.M_y[P.T].map(y => y);
      } else {
        endX = P.M_x[t + 1].map(x => x - delta);
        endY = [...S.startY];
      }
      break;
  }
  return { endX, endY };
}

// =============================================================================
// RENDERING
// =============================================================================
function getCanvas() { return $('aam-canvas'); }
function getCtx()    { return getCanvas().getContext('2d'); }

function updateCanvasSize() {
  const canvas = getCanvas();
  canvas.width  = PADDING * 2 + (P.Nx - 1) * CELL_SIZE + 30;
  canvas.height = PADDING * 2 + (P.Ny - 1) * CELL_SIZE + 30;
}

// Convert lattice coords (lx, ly) [1-indexed, can be fractional] to canvas px
function latToCanvas(lx, ly) {
  const canvas = getCanvas();
  return {
    x: PADDING + (lx - 1) * CELL_SIZE,
    y: canvas.height - PADDING - (ly - 1) * CELL_SIZE,
  };
}

function clearCanvas() {
  const canvas = getCanvas();
  const ctx = getCtx();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = C_BG;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // Draw subtle grid lines
  ctx.strokeStyle = C_GRID;
  ctx.lineWidth = 0.5;
  if (P) {
    for (let x = 1; x <= P.Nx; x++) {
      for (let y = 1; y <= P.Ny; y++) {
        const { x: cx, y: cy } = latToCanvas(x, y);
        ctx.beginPath();
        if (x < P.Nx) {
          const { x: nx } = latToCanvas(x + 1, y);
          ctx.moveTo(cx, cy); ctx.lineTo(nx, cy);
        }
        if (y < P.Ny) {
          const { y: ny } = latToCanvas(x, y + 1);
          ctx.moveTo(cx, cy); ctx.lineTo(cx, ny);
        }
        ctx.stroke();
      }
    }
  }
}

function drawStaticLattice() {
  const ctx = getCtx();
  for (let x = 1; x <= P.Nx; x++) {
    for (let y = 1; y <= P.Ny; y++) {
      const { x: cx, y: cy } = latToCanvas(x, y);
      const filled = S.os[x - 1][y - 1] === 1;
      ctx.beginPath();
      ctx.arc(cx, cy, R_STATIC, 0, Math.PI * 2);
      ctx.fillStyle = filled ? C_STATIC_FILLED : C_STATIC_EMPTY;
      ctx.fill();
      ctx.strokeStyle = filled ? C_STATIC_FILL_STR : C_STATIC_STROKE;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
}

function drawDynamicLattice() {
  const ctx = getCtx();
  for (let i = 0; i < P.dx; i++) {
    for (let j = 0; j < P.dy; j++) {
      const lx = S.xPos[i];
      const ly = S.yPos[j];
      const { x: cx, y: cy } = latToCanvas(lx, ly);
      const filled = S.od[i][j] === 1;
      // Glow effect for filled dynamic atoms
      if (filled) {
        ctx.beginPath();
        ctx.arc(cx, cy, R_DYNAMIC + 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(249,115,22,0.15)';
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(cx, cy, R_DYNAMIC, 0, Math.PI * 2);
      ctx.fillStyle = filled ? C_DYN_FILLED : C_DYN_EMPTY_FILL;
      ctx.fill();
      ctx.strokeStyle = C_DYN_STROKE;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
  }
}

function drawAxisLabels() {
  const ctx = getCtx();
  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let x = 1; x <= P.Nx; x++) {
    const { x: cx, y: cy } = latToCanvas(x, 1);
    ctx.fillText(x, cx, cy + R_STATIC + 4);
  }
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let y = 1; y <= P.Ny; y++) {
    const { x: cx, y: cy } = latToCanvas(1, y);
    ctx.fillText(y, cx - R_STATIC - 4, cy);
  }
}

function render() {
  if (!P || !S) return;
  clearCanvas();
  drawStaticLattice();
  drawDynamicLattice();
  drawAxisLabels();

  // Highlight offload target positions if done
  if (S.phase === 'done') {
    const ctx = getCtx();
    const color = S.offloadSuccess ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)';
    for (let i = 0; i < P.dx; i++) {
      for (let j = 0; j < P.dy; j++) {
        const lx = P.M_x[P.T][i];
        const ly = P.M_y[P.T][j];
        const { x: cx, y: cy } = latToCanvas(lx, ly);
        ctx.beginPath();
        ctx.arc(cx, cy, R_STATIC + 6, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      }
    }
    // Re-draw static lattice on top of highlight
    drawStaticLattice();
    drawAxisLabels();
  }
}

// =============================================================================
// ANIMATION
// =============================================================================
function lerp(a, b, t) { return a + (b - a) * t; }

function animate(timestamp) {
  if (!S || S.phase !== 'substep') return;

  if (!S.animStartTime) S.animStartTime = timestamp;
  const elapsed  = timestamp - S.animStartTime;
  const progress = Math.min(elapsed / subStepDuration, 1);

  // Interpolate positions
  for (let i = 0; i < P.dx; i++)
    S.xPos[i] = lerp(S.startX[i], S.endX[i], progress);
  for (let j = 0; j < P.dy; j++)
    S.yPos[j] = lerp(S.startY[j], S.endY[j], progress);

  render();

  if (progress < 1) {
    animId = requestAnimationFrame(animate);
  } else {
    // Snap to exact end positions
    S.xPos = [...S.endX];
    S.yPos = [...S.endY];
    render();
    onSubStepComplete();
  }
}

function startSubStep(t, subStep) {
  // Update start positions FIRST so computeSubStepTargets can use them
  // for the "unchanged" dimension (cases 1, 2, 3).
  S.startX = [...S.xPos];
  S.startY = [...S.yPos];
  const targets = computeSubStepTargets(t, subStep);
  S.endX   = targets.endX;
  S.endY   = targets.endY;
  S.animStartTime = null;
  S.phase  = 'substep';
  updatePhaseLabel();
  animId = requestAnimationFrame(animate);
}

// Called whenever a sub-step animation finishes (whether playing or stepping).
// Advances state and either continues playing, pauses, or triggers offload/inter-move pause.
function onSubStepComplete() {
  S.currentSubStep++;
  if (S.currentSubStep <= 3) {
    // More sub-steps within this move — continue if playing or move-stepping
    if (isPlaying || moveStepping) startSubStep(S.currentT, S.currentSubStep);
    else { S.phase = 'paused'; updatePhaseLabel(); }
    return;
  }
  // All 4 sub-steps of move(currentT) are done
  S.currentSubStep = 0;
  S.currentT++;
  moveStepping = false; // always stop after one full move when step-mode
  if (S.currentT >= P.T) {
    // All moves finished
    if (isPlaying) schedulePause(doOffload);
    else doOffload();
  } else {
    // More moves remain – pause between moves when playing
    if (isPlaying) schedulePause(() => startSubStep(S.currentT, 0));
    else { S.phase = 'paused'; updatePhaseLabel(); }
  }
}

// Schedule an inter-move pause (play mode only). Callback runs after the pause
// unless it is cancelled (e.g., user clicks Pause).
function schedulePause(callback) {
  S.phase = 'step-pause';
  updatePhaseLabel();
  stepPauseTimer = setTimeout(() => {
    stepPauseTimer = null;
    if (S.phase !== 'step-pause') return; // cancelled by Pause button
    callback();
  }, Math.max(300, subStepDuration));
}

function advanceAnimation() { onSubStepComplete(); } // kept for compatibility

function updatePhaseLabel() {
  if (!S) return;
  const phase = S.phase;
  if (phase === 'ready')      setPhase('ready – press Play or Step');
  else if (phase === 'paused')     setPhase(`paused – t=${S.currentT}, ${SUB_STEP_LABELS[S.currentSubStep] || 'next move'}`);
  else if (phase === 'step-pause') setPhase(`pause after move t=${S.currentT - 1}`);
  else if (phase === 'substep')    setPhase(`t=${S.currentT} / ${P.T-1}, ${SUB_STEP_LABELS[S.currentSubStep]}`);
  else if (phase === 'done')       setPhase('done');
}

// =============================================================================
// CONTROLS
// =============================================================================
function onInitialize() {
  if (animId) { cancelAnimationFrame(animId); animId = null; }
  isPlaying = false;

  const result = parseParameters();
  if (result.err) {
    setStatus('Error: ' + result.err, 'error');
    return;
  }
  P = result.params;
  S = initSim(P);

  // Execute pickup immediately (before any motion visualization)
  doPickup();

  updateCanvasSize();
  render();

  setStatus('Initialized. Dynamic lattice loaded at t=0 positions. Ready to animate.', 'info');
  setPhase('ready – press Play or Step');

  $('btn-reset').disabled  = false;
  $('btn-play').disabled   = false;
  $('btn-step').disabled   = false;
  $('btn-play').textContent = '▶ Play';
}

function onPlayPause() {
  if (!S || S.phase === 'done') return;

  if (isPlaying) {
    // Pause: stop animation and any inter-move timer
    isPlaying = false;
    moveStepping = false;
    if (animId) { cancelAnimationFrame(animId); animId = null; }
    if (stepPauseTimer) { clearTimeout(stepPauseTimer); stepPauseTimer = null; }
    if (S.phase === 'step-pause') S.phase = 'paused'; // cancel inter-move pause
    else S.phase = 'paused';
    $('btn-play').textContent = '▶ Play';
    updatePhaseLabel();
    setStatus('Paused.', 'info');
  } else {
    // Play
    isPlaying = true;
    moveStepping = false;
    $('btn-play').textContent = '⏸ Pause';
    if (S.phase === 'ready') {
      S.currentT = 0;
      S.currentSubStep = 0;
    }
    if (S.currentT >= P.T) { doOffload(); return; }
    startSubStep(S.currentT, S.currentSubStep);
  }
}

function onStep() {
  if (!S || S.phase === 'done') return;

  // Stop any ongoing animation or inter-move pause
  if (isPlaying) {
    isPlaying = false;
    $('btn-play').textContent = '▶ Play';
  }
  moveStepping = false;
  if (animId) { cancelAnimationFrame(animId); animId = null; }
  if (stepPauseTimer) { clearTimeout(stepPauseTimer); stepPauseTimer = null; }

  if (S.phase === 'substep') {
    // Snap current sub-step to its end position, advance state, then animate next
    S.xPos = [...S.endX]; S.yPos = [...S.endY];
    render();
    onSubStepComplete(); // advances counters; may set paused or doOffload
    if (S.phase === 'done') return;
  }

  if (S.phase === 'step-pause') S.phase = 'paused'; // skip the inter-move pause

  if (S.phase === 'ready') {
    S.currentT = 0;
    S.currentSubStep = 0;
    S.phase = 'paused';
  }

  // Animate all 4 sub-steps of the current move(t), then pause
  if (S.currentT >= P.T) { doOffload(); return; }
  moveStepping = true;
  startSubStep(S.currentT, S.currentSubStep);
  // moveStepping=true → sub-steps 0-3 animate continuously
  // → onSubStepComplete resets moveStepping=false after the 4th and pauses
}

function onReset() {
  if (animId) { cancelAnimationFrame(animId); animId = null; }
  if (stepPauseTimer) { clearTimeout(stepPauseTimer); stepPauseTimer = null; }
  isPlaying = false;
  moveStepping = false;
  if (P) {
    S = initSim(P);
    doPickup();
    render();
    setStatus('Reset to initial state.', 'info');
    setPhase('ready – press Play or Step');
    $('btn-play').disabled = false;
    $('btn-step').disabled = false;
    $('btn-play').textContent = '▶ Play';
  }
}

function onSpeedChange(val) {
  subStepDuration = parseInt(val);
  $('speed-label').textContent = val + 'ms';
}

function disableControls() {
  $('btn-reset').disabled = true;
  $('btn-play').disabled  = true;
  $('btn-step').disabled  = true;
  $('btn-play').textContent = '▶ Play';
}

// =============================================================================
// MAIN
// =============================================================================
window.addEventListener('DOMContentLoaded', () => {
  buildOccupationGrid();
  buildMotionMatrix();

  // Populate a default example: 5×5 static, 2×2 dynamic, T=2
  // M = [[1,3,1,3],[2,4,2,4],[1,3,1,3]]
  const defaultM = [[1,3,1,3],[2,5,2,4],[1,3,1,4]];
  const rows = $('motion-matrix').tBodies[0].rows;
  for (let t = 0; t <= 2; t++) {
    const inputs = rows[t].querySelectorAll('input');
    for (let k = 0; k < 4; k++) inputs[k].value = defaultM[t][k];
  }

  // Default occupation: checkerboard-ish
  const cells = $('occ-grid').querySelectorAll('.occ-cell');
  const filledPositions = [[1,2],[1,4],[3,3],[3,5],[5,2],[5,4]]; // (x,y) pairs
  cells.forEach(cell => {
    const x = parseInt(cell.dataset.x);
    const y = parseInt(cell.dataset.y);
    if (filledPositions.some(([fx, fy]) => fx === x && fy === y)) {
      cell.classList.add('filled');
    }
  });

  clearCanvas();
  setStatus('Welcome! Adjust parameters and click Initialize.', '');
  setPhase('idle');
});

// =============================================================================
// MODE TOGGLE & QN INPUT
// =============================================================================

function toggleInputMode() {
  inputMode = (inputMode === 'original') ? 'qn' : 'original';
  $('mode-label').textContent = inputMode === 'original' ? 'Original' : 'QN';
  updateInputPanelForMode();
  updatePresetDropdown(); // Refresh preset dropdown for new mode
}

function updateInputPanelForMode() {
  const matrixSection = document.querySelector('#input-panel > div:nth-child(3)');
  if (inputMode === 'original') {
    // Show motion matrix
    matrixSection.style.display = '';
    const qnSection = $('qn-input-section');
    if (qnSection) qnSection.style.display = 'none';
  } else {
    // Show QN inputs
    matrixSection.style.display = 'none';
    let qnSection = $('qn-input-section');
    if (!qnSection) {
      qnSection = createQNInputSection();
      matrixSection.parentNode.insertBefore(qnSection, matrixSection.nextSibling);
    }
    qnSection.style.display = '';
    buildQNInputs();
  }
}

function createQNInputSection() {
  const section = document.createElement('div');
  section.id = 'qn-input-section';
  section.innerHTML = `
    <div class="section-title">QN Mode: Simplified Motion Input</div>
    <div style="margin-bottom: 12px;">
      <div class="param-grid" style="margin-bottom: 8px;">
        <div class="param-item">
          <label>a<sub>x</sub> (x-spacing)</label>
          <input type="number" id="qn-ax" value="1" min="1" max="5" step="1">
        </div>
        <div class="param-item">
          <label>a<sub>y</sub> (y-spacing)</label>
          <input type="number" id="qn-ay" value="1" min="1" max="5" step="1">
        </div>
      </div>
      <div style="font-size: 0.75rem; color: #64748b; margin-bottom: 8px;">
        Uniform spacing: x<sub>n</sub>(t) = x<sub>1</sub>(t) + (n−1)×a<sub>x</sub>
      </div>
    </div>
    <div id="qn-matrix-wrapper" style="overflow: auto;">
      <table id="qn-motion-table" style="border-collapse: collapse; font-size: 0.8rem;"></table>
    </div>
    <div style="margin-top:6px; font-size:0.75rem; color:#94a3b8;">
      Enter x<sub>1</sub>(t) and y<sub>1</sub>(t) for each time step. Other positions computed automatically.
    </div>
  `;
  return section;
}

function buildQNInputs() {
  const T  = parseInt($('param-T').value);
  const Nx = parseInt($('param-Nx').value);
  const Ny = parseInt($('param-Ny').value);
  
  const table = $('qn-motion-table');
  if (!table) return;
  
  table.innerHTML = '';
  
  // Header row
  const thead = table.createTHead();
  const hrow = thead.insertRow();
  hrow.innerHTML = `
    <th style="background: #f1f5f9; font-size: 0.7rem; color: #475569; padding: 4px 6px;">t</th>
    <th class="x-header" style="background: #ede9fe; color: #4f46e5; font-size: 0.7rem; padding: 4px 6px;">x<sub>1</sub>(t)</th>
    <th class="y-header" style="background: #fef3c7; color: #92400e; font-size: 0.7rem; padding: 4px 6px;">y<sub>1</sub>(t)</th>
  `;
  
  // Body rows: t = 0 .. T
  const tbody = table.createTBody();
  for (let t = 0; t <= T; t++) {
    const row = tbody.insertRow();
    
    // Time label
    const labelCell = row.insertCell();
    labelCell.style.cssText = 'background: #f8fafc; color: #64748b; font-size: 0.7rem; padding: 2px 6px; border: 1px solid #e2e8f0;';
    labelCell.textContent = `t=${t}`;
    
    // x1 input
    const x1Cell = row.insertCell();
    x1Cell.style.cssText = 'background: #f5f3ff; border: 1px solid #e2e8f0; padding: 2px;';
    const x1Input = document.createElement('input');
    x1Input.type = 'number';
    x1Input.min = 1;
    x1Input.max = Nx;
    x1Input.step = 1;
    x1Input.value = 1;
    x1Input.style.cssText = 'width: 50px; border: none; background: transparent; text-align: center; font-size: 0.85rem; padding: 2px;';
    x1Input.onfocus = function() { this.style.outline = '1px solid #6366f1'; this.style.borderRadius = '3px'; this.style.background = '#eef2ff'; };
    x1Input.onblur = function() { this.style.outline = ''; this.style.background = 'transparent'; };
    x1Cell.appendChild(x1Input);
    
    // y1 input
    const y1Cell = row.insertCell();
    y1Cell.style.cssText = 'background: #fffbeb; border: 1px solid #e2e8f0; padding: 2px;';
    const y1Input = document.createElement('input');
    y1Input.type = 'number';
    y1Input.min = 1;
    y1Input.max = Ny;
    y1Input.step = 1;
    y1Input.value = 1;
    y1Input.style.cssText = 'width: 50px; border: none; background: transparent; text-align: center; font-size: 0.85rem; padding: 2px;';
    y1Input.onfocus = function() { this.style.outline = '1px solid #6366f1'; this.style.borderRadius = '3px'; this.style.background = '#eef2ff'; };
    y1Input.onblur = function() { this.style.outline = ''; this.style.background = 'transparent'; };
    y1Cell.appendChild(y1Input);
  }
}

// =============================================================================
// INITIALIZATION
// =============================================================================
// Initialize preset dropdown on page load
document.addEventListener('DOMContentLoaded', function() {
  updatePresetDropdown();
});
