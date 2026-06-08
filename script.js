let WORDS = [];
let PUZZLE = null;

async function loadWords() {
  const res = await fetch("en_filtered.txt");
  const text = await res.text();
  WORDS = text.trim().split("\n");
}

// ----------------------
// Wordle-style daily seed
// ----------------------

function getDayIndex() {
  const start = new Date("2024-01-01");
  const now = new Date();
  return Math.floor((now - start) / (1000 * 60 * 60 * 24));
}

function seededRandom(seed) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// ----------------------
// Pick daily puzzle
// ----------------------

function getDailyPuzzle() {
  const seed = getDayIndex();

  const startIndex = Math.floor(seededRandom(seed) * WORDS.length);
  const endIndex = Math.floor(seededRandom(seed + 1) * WORDS.length);

  return {
    start: WORDS[startIndex],
    end: WORDS[endIndex]
  };
}

// ----------------------
// Word ladder logic
// ----------------------

function isOneMove(a, b) {
  if (a === b) return false;

  let i = 0, j = 0, diff = 0;

  while (i < a.length || j < b.length) {
    if (a[i] !== b[j]) {
      diff++;
      if (diff > 1) return false;

      if (a.length > b.length) i++;
      else if (b.length > a.length) j++;
      else { i++; j++; }
    } else {
      i++;
      j++;
    }
  }

  return diff <= 1;
}

function shortestPath(start, end) {
  let queue = [[start]];
  let visited = new Set([start]);

  while (queue.length) {
    let path = queue.shift();
    let word = path[path.length - 1];

    if (word === end) return path;

    for (let next of WORDS) {
      if (!visited.has(next) && isOneMove(word, next)) {
        visited.add(next);
        queue.push([...path, next]);
      }
    }
  }

  return null;
}

// ----------------------
// UI logic
// ----------------------

async function init() {
  await loadWords();

  PUZZLE = getDailyPuzzle();

  document.getElementById("startWord").innerText = PUZZLE.start;
  document.getElementById("endWord").innerText = PUZZLE.end;
}

async function solve() {
  const result = shortestPath(PUZZLE.start, PUZZLE.end);

  document.getElementById("output").innerText =
    result ? result.join(" → ") : "No path found";
}

init();