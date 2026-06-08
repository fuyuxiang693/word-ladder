let WORDS = [];
let WORDSET = new Set();

let PUZZLE = null;
let path = [];
let guess = "";

let solutionPath = null;
let gameWon = false;
let solutionShown = false;

// --------------------
// CONSTRAINTS
// --------------------
const MIN_LEN = 4;
const MAX_LEN = 6;
const MIN_PATH = 6;
const MAX_PATH = 10;

// --------------------
// LOAD WORDS
// --------------------
async function loadWords() {
  const res = await fetch("en_filtered.txt");
  WORDS = (await res.text())
    .split("\n")
    .map(w => w.trim().toLowerCase())
    .filter(Boolean);

  WORDSET = new Set(WORDS);
}

// --------------------
// EDIT DISTANCE
// --------------------
function isOneEditAway(a, b) {
  if (Math.abs(a.length - b.length) > 1) return false;

  if (a.length === b.length) {
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) diff++;
      if (diff > 1) return false;
    }
    return diff === 1;
  }

  let i = 0, j = 0, diff = 0;

  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++; j++;
    } else {
      diff++;
      if (diff > 1) return false;
      if (a.length > b.length) i++;
      else j++;
    }
  }

  return true;
}

// --------------------
// NEIGHBORS (cached)
// --------------------
const neighborCache = new Map();

function getNeighbors(word) {
  if (neighborCache.has(word)) return neighborCache.get(word);

  const res = [];
  for (const w of WORDS) {
    if (w !== word && isOneEditAway(word, w)) {
      res.push(w);
    }
  }

  neighborCache.set(word, res);
  return res;
}

// --------------------
// RNG
// --------------------
function random_number_generator(seed) {
  return function () {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --------------------
// VALID START/END RULE
// --------------------
function isValidStartEnd(start, end) {
  if (!start || !end) return false;

  for (let i = 0; i < Math.min(start.length, end.length); i++) {
    if (start[i] === end[i]) return false;
  }

  return true;
}

// --------------------
// PUZZLE GENERATION
// --------------------
function getPuzzle() {
  const seed = Math.floor(Date.now() / 86400000);
  const rng = random_number_generator(seed);

  const targetLen =
    Math.floor(rng() * (MAX_PATH - MIN_PATH + 1)) + MIN_PATH;

  for (let i = 0; i < 500; i++) {

    const startIndex = Math.floor(rng() * WORDS.length);
    const start = WORDS[(startIndex + i) % WORDS.length];

    if (!start || start.length < MIN_LEN || start.length > MAX_LEN) continue;

    const queue = [[start]];
    const visited = new Set([start]);

    while (queue.length) {
      const p = queue.shift();
      const node = p[p.length - 1];

      for (const next of getNeighbors(node)) {

        if (visited.has(next)) continue;
        visited.add(next);

        const newPath = [...p, next];

        if (newPath.length > targetLen) continue;

        queue.push(newPath);

        if (
          newPath.length === targetLen &&
          isValidStartEnd(start, next)
        ) {
          return { start, end: next };
        }
      }
    }
  }

  return { start: WORDS[0], end: WORDS[1] };
}

// --------------------
// SOLUTION PATH
// --------------------
function findPath(start, end) {
  const queue = [[start]];
  const visited = new Set([start]);

  while (queue.length) {
    const p = queue.shift();
    const node = p[p.length - 1];

    if (node === end) return p;

    for (const n of getNeighbors(node)) {
      if (!visited.has(n)) {
        visited.add(n);
        queue.push([...p, n]);
      }
    }
  }

  return null;
}

// --------------------
// RENDER
// --------------------
function renderLadder() {
  const ladder = document.getElementById("ladder");
  ladder.innerHTML = "";

  ladder.appendChild(makeRow(PUZZLE.start));

  for (const w of path) {
    ladder.appendChild(makeRow(w));
  }

  // ❌ DO NOT show input row if game is over
  if (!gameWon && !solutionShown) {
    ladder.appendChild(makeInputRow());
  }

  ladder.appendChild(makeRow(PUZZLE.end, true));
}

function makeRow(word, isEnd = false) {
  const row = document.createElement("div");
  row.className = "row";

  for (let i = 0; i < word.length; i++) {
    const t = document.createElement("div");
    t.className = "tile";
    t.innerText = word[i].toUpperCase();

    if (isEnd) t.classList.add("green");
    else t.classList.add(word[i] === PUZZLE.end[i] ? "green" : "grey");

    row.appendChild(t);
  }

  return row;
}

function makeInputRow() {
  const row = document.createElement("div");
  row.className = "row";

  for (let i = 0; i < Math.max(guess.length, 1); i++) {
    const t = document.createElement("div");
    t.className = "tile";
    t.innerText = guess[i]?.toUpperCase() || "";
    row.appendChild(t);
  }

  return row;
}

// --------------------
// KEYBOARD
// --------------------
function createKeyboard() {
  const layout = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];
  const kb = document.getElementById("keyboard");
  kb.innerHTML = "";

  function key(label, fn, extraClass = "") {
    const k = document.createElement("div");
    k.className = "key " + extraClass;
    k.innerText = label;
    k.onclick = fn;
    return k;
  }

  const row1 = document.createElement("div");
  row1.className = "keyrow";

  for (const ch of layout[0]) {
    row1.appendChild(key(ch.toUpperCase(), () => {
      if (!gameWon && !solutionShown) {
        guess += ch;
        renderLadder();
      }
    }));
  }

  const row2 = document.createElement("div");
  row2.className = "keyrow";

  for (const ch of layout[1]) {
    row2.appendChild(key(ch.toUpperCase(), () => {
      if (!gameWon && !solutionShown) {
        guess += ch;
        renderLadder();
      }
    }));
  }

  const row3 = document.createElement("div");
  row3.className = "keyrow";

  const enter = key("ENTER", submit, "special-key enter-key");

  const back = key("⌫", () => {
    if (!gameWon && !solutionShown) {
      guess = guess.slice(0, -1);
      renderLadder();
    }
  }, "special-key back-key");

  row3.appendChild(enter);

  for (const ch of layout[2]) {
    row3.appendChild(key(ch.toUpperCase(), () => {
      if (!gameWon && !solutionShown) {
        guess += ch;
        renderLadder();
      }
    }));
  }

  row3.appendChild(back);

  kb.appendChild(row1);
  kb.appendChild(row2);
  kb.appendChild(row3);
}

// --------------------
// INPUT
// --------------------
document.addEventListener("keydown", (e) => {
  if (!PUZZLE || gameWon || solutionShown) return;

  if (e.key === "Enter") {
    e.preventDefault();
    submit();
    return;
  }

  if (e.key === "Backspace") {
    guess = guess.slice(0, -1);
    renderLadder();
    return;
  }

  if (/^[a-z]$/i.test(e.key)) {
    guess += e.key.toLowerCase();
    renderLadder();
  }
});

// --------------------
// SUBMIT
// --------------------
function submit() {
  const last = path.length ? path[path.length - 1] : PUZZLE.start;
  const word = guess.trim().toLowerCase();

  const isValid = WORDSET.has(word) && isOneEditAway(last, word);

  if (!isValid) {
    renderLadder();

    // 🔥 delay wiggle until DOM updates
    requestAnimationFrame(() => {
      wiggle();
    });

    return;
  }

  path.push(word);
  guess = "";

  if (isOneEditAway(word, PUZZLE.end) || word === PUZZLE.end) {
    gameWon = true;
    setTimeout(() => alert("YOU WIN 🎉"), 100);
  }

  renderLadder();
}

// --------------------
// UNDO (FIXED)
// --------------------
function undo() {
  if (gameWon || solutionShown) return;

  if (path.length === 0) return;

  path.pop();
  guess = "";

  renderLadder();
}

// --------------------
// SHOW SOLUTION
// --------------------
function showSolution() {
  if (!solutionPath) return;

  solutionShown = true;
  path = solutionPath.slice(1, -1);
  guess = "";

  renderLadder();
}

// --------------------
// WIGGLE
// --------------------
function wiggle() {
  const ladder = document.getElementById("ladder");
  const rows = ladder.getElementsByClassName("row");

  if (rows.length < 2) return;

  const inputRow = rows[rows.length - 2];

  if (!inputRow) return;

  inputRow.classList.remove("wiggle");
  void inputRow.offsetWidth;
  inputRow.classList.add("wiggle");

  setTimeout(() => {
    inputRow.classList.remove("wiggle");
  }, 300);
}

// --------------------
// INIT
// --------------------
async function init() {
  await loadWords();

  PUZZLE = getPuzzle();
  solutionPath = findPath(PUZZLE.start, PUZZLE.end);

  path = [];
  gameWon = false;
  solutionShown = false;

  renderLadder();
  createKeyboard();
}

init();