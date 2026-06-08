let WORDS = [];
let PUZZLE = null;

let path = [];
let guess = "";
let solutionPath = null;

let gameWon = false;
let solutionShown = false;

// --------------------
// CONSTRAINTS
// --------------------
const MIN_LEN = 5;
const MIN_PATH = 5;
const MAX_PATH = 10;

// --------------------
// LOAD WORDS
// --------------------
async function loadWords() {
  const res = await fetch("en_filtered.txt");
  WORDS = (await res.text())
    .split("\n")
    .map(w => w.trim().toLowerCase());
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
// CACHE NEIGHBORS
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
// BFS PATH
// --------------------
function findPath(start, end) {
  const queue = [[start]];
  const visited = new Set([start]);

  while (queue.length) {
    const path = queue.shift();
    const node = path[path.length - 1];

    if (node === end) return path;

    for (const n of getNeighbors(node)) {
      if (!visited.has(n)) {
        visited.add(n);
        queue.push([...path, n]);
      }
    }
  }

  return null;
}

// --------------------
// PUZZLE
// --------------------
function getPuzzle() {
  const seed = Math.floor(Date.now() / 86400000);

  for (let i = 0; i < 500; i++) {
    const start = WORDS[(seed + i) % WORDS.length];
    const end = WORDS[(seed * 17 + i) % WORDS.length];

    if (start.length < MIN_LEN || end.length < MIN_LEN) continue;

    const p = findPath(start, end);

    if (!p) continue;
    if (p.length < MIN_PATH || p.length > MAX_PATH) continue;

    return { start, end };
  }

  return { start: WORDS[0], end: WORDS[1] };
}

// --------------------
// VALID MOVE
// --------------------
function isValidMove(from, to) {
  return WORDS.includes(to) && isOneEditAway(from, to);
}

// --------------------
// RENDER ROW
// --------------------
function makeRow(word, isEnd = false) {
  const row = document.createElement("div");
  row.className = "row";

  for (let i = 0; i < word.length; i++) {
    const t = document.createElement("div");
    t.className = "tile";

    t.innerText = word[i].toUpperCase();

    if (isEnd) {
      t.classList.add("green");
    } else {
      t.classList.add(word[i] === PUZZLE.end[i] ? "green" : "grey");
    }

    row.appendChild(t);
  }

  return row;
}

// --------------------
// MAIN RENDER
// --------------------
function renderLadder() {
  const ladder = document.getElementById("ladder");
  ladder.innerHTML = "";

  ladder.appendChild(makeRow(PUZZLE.start));

  for (const w of path) {
    ladder.appendChild(makeRow(w));
  }

  ladder.appendChild(makeInputRow());

  ladder.appendChild(makeRow(PUZZLE.end, true));
}

// --------------------
// INPUT ROW
// --------------------
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
  const layout = [
    "qwertyuiop",
    "asdfghjkl",
    "zxcvbnm"
  ];

  const kb = document.getElementById("keyboard");
  kb.innerHTML = "";

  for (const row of layout) {
    const rowDiv = document.createElement("div");
    rowDiv.className = "keyrow";

    for (const ch of row) {
      const key = document.createElement("div");
      key.className = "key";
      key.innerText = ch.toUpperCase();

      key.onclick = () => {
        if (!gameWon && !solutionShown) {
          guess += ch;
          renderLadder();
        }
      };

      rowDiv.appendChild(key);
    }

    kb.appendChild(rowDiv);
  }
}

// --------------------
// KEY INPUT
// --------------------
document.addEventListener("keydown", (e) => {
  if (!PUZZLE || gameWon || solutionShown) return;

  if (e.key === "Enter") submit();
  else if (e.key === "Backspace") guess = guess.slice(0, -1);
  else if (/^[a-z]$/i.test(e.key)) guess += e.key.toLowerCase();

  renderLadder();
});

// --------------------
// SUBMIT (FIXED)
// --------------------
function submit() {
  if (gameWon || solutionShown) return;

  const last = path.length ? path[path.length - 1] : PUZZLE.start;
  const word = guess.trim().toLowerCase();

  if (!isValidMove(last, word)) {
    renderLadder();

    requestAnimationFrame(() => {
      wiggleInputRow();
    });

    return;
  }

  path.push(word);
  guess = "";

  checkWin(word);

  renderLadder();
}

// --------------------
// WIN CHECK
// --------------------
function checkWin(word) {
  if (word === PUZZLE.end || isOneEditAway(word, PUZZLE.end)) {
    gameWon = true;
    setTimeout(() => alert("YOU WIN 🎉"), 100);
  }
}

// --------------------
// WIGGLE INPUT ROW (FIXED)
// --------------------
function wiggleInputRow() {
  const ladder = document.getElementById("ladder");
  const rows = ladder.getElementsByClassName("row");

  if (!rows.length) return;

  // input row is ALWAYS the second-to-last row
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
// UNDO
// --------------------
function undo() {
  if (gameWon || solutionShown) return;

  if (path.length) path.pop();
  renderLadder();
}

// --------------------
// SHOW SOLUTION
// --------------------
function showSolution() {
  if (!solutionPath || gameWon) return;

  solutionShown = true;

  path = solutionPath.slice(1, -1);
  guess = "";

  renderLadder();
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