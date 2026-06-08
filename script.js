let WORDS = [];

async function loadWords() {
  const res = await fetch("en_filtered.txt");
  const text = await res.text();
  WORDS = text.trim().split("\n");
}

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

async function run() {
  if (WORDS.length === 0) await loadWords();

  const start = document.getElementById("start").value.trim().toLowerCase();
  const end = document.getElementById("end").value.trim().toLowerCase();

  const result = shortestPath(start, end);

  document.getElementById("output").innerText =
    result ? result.join(" → ") : "No path found";
}