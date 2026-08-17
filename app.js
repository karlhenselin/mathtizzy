const STORAGE_KEY = "mathtizzy-progress";
const FACT_RETRY_AFTER = 2;
const FACT_FAST_MS = 2500;
const FACT_SLOW_MS = 8000;
const FACT_TIME_CAP_MS = 20000;
const FACT_RED = [231, 111, 81];
const FACT_MID = [244, 208, 96];
const FACT_GREEN = [42, 157, 143];
const OP_TITLES = { "+": "Addition", "-": "Subtraction", "×": "Multiplication", "÷": "Division" };
const factPoolCache = new Map();

const LEVELS = [
  { name: "Tiny Totals", blurb: "Add numbers up to 5.", ops: ["+"], min: 1, max: 5, needed: 120 },
  { name: "Adding Up", blurb: "Addition facts through 10.", ops: ["+"], min: 1, max: 10, needed: 150 },
  { name: "Take Away", blurb: "Subtraction without negatives.", ops: ["-"], min: 1, max: 10, needed: 150 },
  { name: "Plus & Minus", blurb: "Mix addition and subtraction.", ops: ["+", "-"], min: 1, max: 12, needed: 180 },
  { name: "Times Starter", blurb: "Multiplication facts through 5.", ops: ["×"], min: 1, max: 5, needed: 150 },
  { name: "Times Tables", blurb: "Multiplication facts through 10.", ops: ["×"], min: 1, max: 10, needed: 180 },
  { name: "Fair Shares", blurb: "Division facts with whole-number answers.", ops: ["÷"], min: 1, max: 10, needed: 150 },
  { name: "Fact Mixer", blurb: "All four operations through 12.", ops: ["+", "-", "×", "÷"], min: 1, max: 12, needed: 225 },
  { name: "Bigger Bites", blurb: "Larger addends, still-solid facts.", ops: ["+", "-", "×", "÷"], min: 2, max: 20, mulMax: 12, needed: 225 },
  { name: "Two-Digit Mix", blurb: "Two-digit addition and subtraction.", ops: ["+", "-"], min: 10, max: 50, needed: 180 },
  { name: "Speed Facts", blurb: "Classic facts with a 7-second clock.", ops: ["+", "-", "×", "÷"], min: 1, max: 12, needed: 225, timeLimit: 7 },
  { name: "Mathlete", blurb: "Expert mix. 5 seconds each.", ops: ["+", "-", "×", "÷"], min: 2, max: 20, mulMax: 12, needed: 300, timeLimit: 5 },
];

const PRAISE = [
  "Nice!",
  "Great!",
  "Yes!",
  "Got it!",
  "Nailed it!",
  "Spot on!",
  "Perfect!",
  "Boom!",
  "Right on!",
  "Sharp!",
  "Exactly!",
  "You got it!",
  "Clean!",
  "Bravo!",
];

const state = {
  levelIndex: 0,
  mastery: 0,
  streak: 0,
  bestStreak: 0,
  correct: 0,
  attempted: 0,
  sound: true,
  finished: false,
  input: "",
  problem: null,
  locked: false,
  timerId: null,
  remaining: null,
  lastPraise: "",
  shownAt: 0,
  factScores: {},
  retrySoon: [],
};

const els = {
  homeScreen: document.getElementById("homeScreen"),
  playScreen: document.getElementById("playScreen"),
  homeStats: document.getElementById("homeStats"),
  homeLevel: document.getElementById("homeLevel"),
  homeStreak: document.getElementById("homeStreak"),
  homeSolved: document.getElementById("homeSolved"),
  startBtn: document.getElementById("startBtn"),
  resetBtn: document.getElementById("resetBtn"),
  homeBtn: document.getElementById("homeBtn"),
  soundBtn: document.getElementById("soundBtn"),
  levelKicker: document.getElementById("levelKicker"),
  levelName: document.getElementById("levelName"),
  masteryBar: document.getElementById("masteryBar"),
  masteryFill: document.getElementById("masteryFill"),
  masteryLabel: document.getElementById("masteryLabel"),
  factsWrap: document.getElementById("factsWrap"),
  factsBtn: document.getElementById("factsBtn"),
  factsPop: document.getElementById("factsPop"),
  factsPopTitle: document.getElementById("factsPopTitle"),
  factsMaps: document.getElementById("factsMaps"),
  streakValue: document.getElementById("streakValue"),
  accuracyValue: document.getElementById("accuracyValue"),
  timerHud: document.getElementById("timerHud"),
  timerValue: document.getElementById("timerValue"),
  problemCard: document.getElementById("problemCard"),
  leftOperand: document.getElementById("leftOperand"),
  rightOperand: document.getElementById("rightOperand"),
  operator: document.getElementById("operator"),
  answerSlot: document.getElementById("answerSlot"),
  feedback: document.getElementById("feedback"),
  numpad: document.getElementById("numpad"),
  overlay: document.getElementById("levelOverlay"),
  overlayEyebrow: document.getElementById("overlayEyebrow"),
  overlayTitle: document.getElementById("overlayTitle"),
  overlayBlurb: document.getElementById("overlayBlurb"),
  overlayContinue: document.getElementById("overlayContinue"),
  overlayStayNote: document.getElementById("overlayStayNote"),
  overlayStay: document.getElementById("overlayStay"),
  resetOverlay: document.getElementById("resetOverlay"),
  resetCancelBtn: document.getElementById("resetCancelBtn"),
  resetConfirmBtn: document.getElementById("resetConfirmBtn"),
};

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(list) {
  return list[rand(0, list.length - 1)];
}

function factKey(problem) {
  return `${problem.a}${problem.op}${problem.b}`;
}

function sameProblem(left, right) {
  return left && right && left.a === right.a && left.b === right.b && left.op === right.op;
}

function isAddOrSub(op) {
  return op === "+" || op === "-";
}

function emptyFactStats() {
  return { right: 0, wrong: 0, correctMs: 0 };
}

function getFactStats(key) {
  return state.factScores[key] ?? emptyFactStats();
}

function factAvgMs(stats) {
  if (!stats || !stats.right) return null;
  return stats.correctMs / stats.right;
}

function factWeight(stats) {
  if (!stats || (!stats.right && !stats.wrong)) return 1;
  if (!stats.right) return 1 + stats.wrong * 2;
  const avg = factAvgMs(stats);
  if (avg == null || avg <= FACT_FAST_MS) return 1 + stats.wrong;
  return 1 + stats.wrong + Math.min(6, (avg - FACT_FAST_MS) / FACT_FAST_MS);
}

function normalizeFactScores(raw) {
  const out = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  for (const [key, value] of Object.entries(raw)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      out[key] = {
        right: Math.max(0, Number(value.right) || 0),
        wrong: Math.max(0, Number(value.wrong) || 0),
        correctMs: Math.max(0, Number(value.correctMs) || 0),
      };
    } else if (typeof value === "number") {
      out[key] =
        value >= 0
          ? { right: value, wrong: 0, correctMs: 0 }
          : { right: 0, wrong: 1, correctMs: 0 };
    }
  }
  return out;
}

function factInLevel(fact, level) {
  if (!level.ops.includes(fact.op)) return false;
  if (fact.a < level.min || fact.a > level.max) return false;
  if (fact.b < level.min || fact.b > level.max) return false;
  if (fact.op === "-" && fact.a < fact.b) return false;
  return true;
}

function getFactPool(level, op) {
  const cacheKey = `${op}:${level.min}:${level.max}`;
  if (factPoolCache.has(cacheKey)) return factPoolCache.get(cacheKey);

  const pool = [];
  for (let a = level.min; a <= level.max; a += 1) {
    for (let b = level.min; b <= level.max; b += 1) {
      if (op === "-" && a < b) continue;
      pool.push({
        a,
        b,
        op,
        answer: op === "+" ? a + b : a - b,
      });
    }
  }
  factPoolCache.set(cacheKey, pool);
  return pool;
}

function pickWeightedFact(level, op) {
  const pool = getFactPool(level, op);
  const eligible = pool.filter((fact) => !sameProblem(fact, state.problem));
  const use = eligible.length ? eligible : pool;
  let total = 0;
  const weights = use.map((fact) => {
    const weight = factWeight(state.factScores[factKey(fact)]);
    total += weight;
    return weight;
  });
  let roll = Math.random() * total;
  for (let i = 0; i < use.length; i += 1) {
    roll -= weights[i];
    if (roll <= 0) return use[i];
  }
  return use[use.length - 1];
}

function dequeueRetry(problem) {
  const key = factKey(problem);
  state.retrySoon = state.retrySoon.filter((item) => factKey(item) !== key);
}

function queueRetry(problem) {
  dequeueRetry(problem);
  state.retrySoon.push({
    a: problem.a,
    b: problem.b,
    op: problem.op,
    dueAt: state.attempted + FACT_RETRY_AFTER,
  });
}

function takeDueRetry(level) {
  const index = state.retrySoon.findIndex(
    (item) => item.dueAt <= state.attempted && factInLevel(item, level) && !sameProblem(item, state.problem)
  );
  if (index === -1) return null;
  const [item] = state.retrySoon.splice(index, 1);
  return {
    a: item.a,
    b: item.b,
    op: item.op,
    answer: item.op === "+" ? item.a + item.b : item.a - item.b,
  };
}

function recordFact(problem, correct, elapsedMs) {
  const key = factKey(problem);
  const stats = { ...getFactStats(key) };
  if (correct) {
    stats.right += 1;
    stats.correctMs += Math.round(Math.max(0, Math.min(elapsedMs, FACT_TIME_CAP_MS)));
    dequeueRetry(problem);
  } else {
    stats.wrong += 1;
    if (isAddOrSub(problem.op)) queueRetry(problem);
  }
  state.factScores[key] = stats;
}

function praiseFor(streak) {
  const options = PRAISE.filter((line) => line !== state.lastPraise);
  const line = pick(options.length ? options : PRAISE);
  state.lastPraise = line;
  return streak > 1 ? `${line} Streak ${streak}` : line;
}

function currentLevel() {
  return LEVELS[Math.min(state.levelIndex, LEVELS.length - 1)];
}

function mulMax(level) {
  return level.mulMax ?? level.max;
}

function makeProblem(level) {
  const op = pick(level.ops);
  let a;
  let b;
  let answer;

  if (op === "+") {
    return pickWeightedFact(level, "+");
  } else if (op === "-") {
    return pickWeightedFact(level, "-");
  } else if (op === "×") {
    a = rand(1, mulMax(level));
    b = rand(1, mulMax(level));
    answer = a * b;
  } else {
    b = rand(1, mulMax(level));
    answer = rand(1, mulMax(level));
    a = b * answer;
  }

  return { a, b, op, answer };
}

function generateProblem() {
  const level = currentLevel();
  const retry = takeDueRetry(level);
  if (retry) return retry;

  let next = makeProblem(level);
  for (let i = 0; i < 8; i += 1) {
    if (!sameProblem(next, state.problem)) break;
    next = makeProblem(level);
  }
  if (isAddOrSub(next.op)) dequeueRetry(next);
  return next;
}

function save() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      levelIndex: state.levelIndex,
      mastery: state.mastery,
      streak: state.streak,
      bestStreak: state.bestStreak,
      correct: state.correct,
      attempted: state.attempted,
      sound: state.sound,
      finished: state.finished,
      factScores: state.factScores,
      retrySoon: state.retrySoon,
    })
  );
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    Object.assign(state, {
      levelIndex: data.levelIndex ?? 0,
      mastery: data.mastery ?? 0,
      streak: data.streak ?? 0,
      bestStreak: data.bestStreak ?? 0,
      correct: data.correct ?? 0,
      attempted: data.attempted ?? 0,
      sound: data.sound ?? true,
      finished: data.finished ?? false,
      factScores: normalizeFactScores(data.factScores),
      retrySoon: Array.isArray(data.retrySoon) ? data.retrySoon : [],
    });
  } catch {
    /* ignore broken saves */
  }
}

function showScreen(name) {
  els.homeScreen.classList.toggle("is-active", name === "home");
  els.playScreen.classList.toggle("is-active", name === "play");
}

function accuracyText() {
  if (!state.attempted) return "—";
  return `${Math.round((state.correct / state.attempted) * 100)}%`;
}

function renderHome() {
  const hasProgress = state.attempted > 0 || state.levelIndex > 0;
  els.homeStats.hidden = !hasProgress;
  els.resetBtn.hidden = !hasProgress;
  els.homeLevel.textContent = String(Math.min(state.levelIndex + 1, LEVELS.length));
  els.homeStreak.textContent = String(state.bestStreak);
  els.homeSolved.textContent = String(state.correct);
  els.startBtn.textContent = hasProgress ? "Continue practicing" : "Start practicing";
  updateSoundButton();
}

function updateSoundButton() {
  els.soundBtn.setAttribute("aria-pressed", String(state.sound));
  els.soundBtn.textContent = state.sound ? "♪" : "🔇";
}

function renderPlayHud() {
  const level = currentLevel();
  const percent = Math.round((state.mastery / level.needed) * 100);
  els.levelKicker.textContent = state.levelIndex >= LEVELS.length - 1 ? "Final level" : `Level ${state.levelIndex + 1}`;
  els.levelName.textContent = level.name;
  els.masteryFill.style.width = `${Math.min(percent, 100)}%`;
  els.masteryBar.setAttribute("aria-valuenow", String(Math.min(percent, 100)));
  els.masteryLabel.textContent = `Mastery ${Math.min(percent, 100)}%`;
  els.streakValue.textContent = String(state.streak);
  els.accuracyValue.textContent = accuracyText();
  els.timerHud.hidden = !level.timeLimit;
  if (factsPopOpen()) renderFactsMap();
}

function mixRgb(from, to, t) {
  return from.map((channel, i) => Math.round(channel + (to[i] - channel) * t));
}

function rgbCss(rgb) {
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

function factFill(key) {
  const stats = state.factScores[key];
  if (!stats || (!stats.right && !stats.wrong)) return "#ffffff";
  if (!stats.right) return rgbCss(FACT_RED);
  const avg = factAvgMs(stats);
  const t = 1 - (avg - FACT_FAST_MS) / (FACT_SLOW_MS - FACT_FAST_MS);
  const u = Math.max(0, Math.min(1, t));
  if (u < 0.5) return rgbCss(mixRgb(FACT_RED, FACT_MID, u * 2));
  return rgbCss(mixRgb(FACT_MID, FACT_GREEN, (u - 0.5) * 2));
}

function factTooltip(fact) {
  const label = `${fact.a} ${fact.op} ${fact.b}`;
  const stats = state.factScores[factKey(fact)];
  if (!stats || (!stats.right && !stats.wrong)) return label;
  const parts = [`${stats.right} right`, `${stats.wrong} wrong`];
  const avg = factAvgMs(stats);
  if (avg != null) parts.push(`${(avg / 1000).toFixed(1)}s avg`);
  return `${label} — ${parts.join(", ")}`;
}

function factAxis(min, max) {
  const values = [];
  for (let n = min; n <= max; n += 1) values.push(n);
  return values;
}

function shouldLabelAxis(index, count, value) {
  if (count <= 12) return true;
  if (index === 0 || index === count - 1) return true;
  const step = count > 24 ? 10 : 5;
  return value % step === 0;
}

function mapRange(level, op) {
  if (op === "+" || op === "-") return { min: level.min, max: level.max };
  return { min: 1, max: mulMax(level) };
}

function makeAxisCell(text, extraClass = "") {
  const cell = document.createElement("div");
  cell.className = `fact-cell is-axis${extraClass ? ` ${extraClass}` : ""}`;
  cell.textContent = text;
  return cell;
}

function makeFactMap(level, op) {
  const { min, max } = mapRange(level, op);
  const values = factAxis(min, max);
  const wrap = document.createElement("section");
  wrap.className = "fact-map";

  const title = document.createElement("p");
  title.className = "fact-map-title";
  title.textContent = OP_TITLES[op];
  wrap.appendChild(title);

  const table = document.createElement("div");
  table.className = "fact-table";
  table.style.gridTemplateColumns = `minmax(1rem, auto) repeat(${values.length}, minmax(0, 1fr))`;
  table.appendChild(makeAxisCell("", "is-corner"));
  values.forEach((value, index) => {
    table.appendChild(makeAxisCell(shouldLabelAxis(index, values.length, value) ? String(value) : ""));
  });

  values.forEach((row, rowIndex) => {
    table.appendChild(makeAxisCell(shouldLabelAxis(rowIndex, values.length, row) ? String(row) : ""));
    values.forEach((col) => {
      const cell = document.createElement("div");
      if (op === "-" && row < col) {
        cell.className = "fact-cell is-blank";
        cell.title = "";
      } else {
        const fact =
          op === "÷"
            ? { a: row * col, b: col, op, answer: row }
            : { a: row, b: col, op, answer: op === "+" ? row + col : op === "-" ? row - col : row * col };
        cell.className = "fact-cell";
        cell.style.background = factFill(factKey(fact));
        cell.title = factTooltip(fact);
      }
      table.appendChild(cell);
    });
  });

  wrap.appendChild(table);
  return wrap;
}

function factsPopOpen() {
  return (
    els.factsWrap.classList.contains("is-open") ||
    els.factsWrap.matches(":hover") ||
    els.factsWrap.contains(document.activeElement)
  );
}

function renderFactsMap() {
  const level = currentLevel();
  els.factsPopTitle.textContent = level.name;
  els.factsMaps.replaceChildren(...level.ops.map((op) => makeFactMap(level, op)));
}

function setFactsOpen(open) {
  els.factsWrap.classList.toggle("is-open", open);
  els.factsBtn.setAttribute("aria-expanded", String(open));
  if (open) renderFactsMap();
}

function renderProblem() {
  const { a, b, op } = state.problem;
  els.leftOperand.textContent = String(a);
  els.rightOperand.textContent = String(b);
  els.operator.textContent = op;
  els.answerSlot.textContent = state.input || "?";
  els.answerSlot.classList.toggle("is-empty", !state.input);
}

function beep(ok) {
  if (!state.sound) return;
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = ok ? 740 : 220;
  gain.gain.value = 0.05;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.12);
  osc.onended = () => ctx.close();
}

function clearTimer() {
  if (state.timerId) {
    window.clearInterval(state.timerId);
    state.timerId = null;
  }
}

function startTimer() {
  clearTimer();
  const level = currentLevel();
  if (!level.timeLimit) {
    els.timerValue.textContent = "—";
    return;
  }
  state.remaining = level.timeLimit;
  els.timerValue.textContent = `${state.remaining}s`;
  state.timerId = window.setInterval(() => {
    state.remaining -= 1;
    els.timerValue.textContent = `${Math.max(state.remaining, 0)}s`;
    if (state.remaining <= 0) {
      clearTimer();
      grade(null);
    }
  }, 1000);
}

function nextProblem() {
  state.locked = false;
  state.input = "";
  state.problem = generateProblem();
  state.shownAt = performance.now();
  els.problemCard.classList.remove("is-correct", "is-wrong");
  els.feedback.textContent = "";
  renderPlayHud();
  renderProblem();
  startTimer();
}

function showOverlay({ title, blurb, stayNote = "", eyebrow = "Mastered", continueLabel = "Level up", stayLabel = "Stay here", canStay = true }) {
  setFactsOpen(false);
  els.overlayEyebrow.textContent = eyebrow;
  els.overlayTitle.textContent = title;
  els.overlayBlurb.textContent = blurb;
  els.overlayStayNote.textContent = stayNote;
  els.overlayStayNote.hidden = !canStay || !stayNote;
  els.overlayContinue.textContent = continueLabel;
  els.overlayStay.textContent = stayLabel;
  els.overlayStay.hidden = !canStay;
  els.overlay.hidden = false;
  els.overlayContinue.focus();
}

function maybeLevelUp() {
  const level = currentLevel();
  if (state.mastery < level.needed) return;

  if (state.levelIndex >= LEVELS.length - 1) {
    state.mastery = level.needed;
    state.finished = true;
    showOverlay({
      eyebrow: "Champion",
      title: "You finished the ladder",
      blurb: "Keep practicing in Mathlete mode. Facts stay mixed and timed. Mastery starts over so you can fill the bar again.",
      continueLabel: "Keep practicing",
      canStay: false,
    });
    save();
    return;
  }

  const next = LEVELS[state.levelIndex + 1];
  showOverlay({
    title: level.name,
    blurb: `Level up to ${next.name}: ${next.blurb} Or stay here and start the mastery bar over.`,
    stayNote: `Stay on ${level.name}: ${level.blurb}`,
  });
  save();
}

function grade(rawAnswer) {
  if (state.locked || !state.problem) return;
  state.locked = true;
  clearTimer();

  const correct = rawAnswer === state.problem.answer;
  const elapsedMs = state.shownAt ? performance.now() - state.shownAt : 0;
  state.attempted += 1;
  recordFact(state.problem, correct, elapsedMs);
  els.problemCard.classList.toggle("is-correct", correct);
  els.problemCard.classList.toggle("is-wrong", !correct);
  beep(correct);

  if (correct) {
    state.correct += 1;
    state.streak += 1;
    state.bestStreak = Math.max(state.bestStreak, state.streak);
    state.mastery += Math.min(state.streak, 6);
    els.feedback.textContent = praiseFor(state.streak);
  } else {
    state.streak = 0;
    state.mastery = Math.max(0, state.mastery - 1);
    const shown = rawAnswer === null ? "Time's up." : "Not quite.";
    els.feedback.textContent = `${shown} It was ${state.problem.answer}.`;
    els.answerSlot.textContent = String(state.problem.answer);
    els.answerSlot.classList.remove("is-empty");
  }

  renderPlayHud();
  save();

  window.setTimeout(() => {
    maybeLevelUp();
    if (!els.overlay.hidden) return;
    nextProblem();
  }, correct ? 450 : 2200);
}

function submit() {
  if (!state.input) return;
  grade(Number(state.input));
}

function handleKey(key) {
  if (!els.playScreen.classList.contains("is-active") || state.locked || !els.overlay.hidden) return;
  if (key >= "0" && key <= "9") {
    if (state.input.length >= 4) return;
    state.input += key;
    renderProblem();
    return;
  }
  if (key === "back") {
    state.input = state.input.slice(0, -1);
    renderProblem();
    return;
  }
  if (key === "enter") submit();
}

function startPlay() {
  showScreen("play");
  nextProblem();
}

els.startBtn.addEventListener("click", startPlay);
els.homeBtn.addEventListener("click", () => {
  clearTimer();
  setFactsOpen(false);
  showScreen("home");
  renderHome();
});
els.factsWrap.addEventListener("mouseenter", renderFactsMap);
els.factsBtn.addEventListener("focus", renderFactsMap);
els.factsBtn.addEventListener("click", (event) => {
  event.stopPropagation();
  if (window.matchMedia("(hover: hover)").matches) {
    renderFactsMap();
    return;
  }
  setFactsOpen(!els.factsWrap.classList.contains("is-open"));
});
document.addEventListener("click", (event) => {
  if (!els.factsWrap.contains(event.target)) setFactsOpen(false);
});
function showResetConfirm() {
  els.resetOverlay.hidden = false;
  els.resetCancelBtn.focus();
}

function hideResetConfirm() {
  els.resetOverlay.hidden = true;
}

function resetProgress() {
  localStorage.removeItem(STORAGE_KEY);
  Object.assign(state, {
    levelIndex: 0,
    mastery: 0,
    streak: 0,
    bestStreak: 0,
    correct: 0,
    attempted: 0,
    sound: state.sound,
    finished: false,
    factScores: {},
    retrySoon: [],
  });
  hideResetConfirm();
  renderHome();
}

els.resetBtn.addEventListener("click", showResetConfirm);
els.resetCancelBtn.addEventListener("click", hideResetConfirm);
els.resetConfirmBtn.addEventListener("click", resetProgress);
els.soundBtn.addEventListener("click", () => {
  state.sound = !state.sound;
  updateSoundButton();
  save();
});
function hideLevelOverlay() {
  els.overlay.hidden = true;
  nextProblem();
}

function continueFromOverlay() {
  if (els.overlay.hidden) return;
  if (state.levelIndex < LEVELS.length - 1) {
    state.levelIndex += 1;
  }
  state.mastery = 0;
  save();
  hideLevelOverlay();
}

function stayAtLevel() {
  if (els.overlay.hidden || els.overlayStay.hidden) return;
  state.mastery = 0;
  save();
  hideLevelOverlay();
}

els.overlayContinue.addEventListener("click", continueFromOverlay);
els.overlayStay.addEventListener("click", stayAtLevel);
els.numpad.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-key]");
  if (!button) return;
  handleKey(button.dataset.key);
});
window.addEventListener("keydown", (event) => {
  if (els.factsWrap.classList.contains("is-open") && event.key === "Escape") {
    event.preventDefault();
    setFactsOpen(false);
    return;
  }
  if (!els.resetOverlay.hidden) {
    if (event.key === "Escape") {
      event.preventDefault();
      hideResetConfirm();
    } else if (event.key === "Enter") {
      event.preventDefault();
      const active = document.activeElement;
      if (active === els.resetConfirmBtn) resetProgress();
      else hideResetConfirm();
    }
    return;
  }
  if (!els.overlay.hidden) {
    if (event.key === "Enter") {
      event.preventDefault();
      if (document.activeElement === els.overlayStay) stayAtLevel();
      else continueFromOverlay();
    }
    return;
  }
  if (event.key >= "0" && event.key <= "9") handleKey(event.key);
  else if (event.key === "Backspace") {
    event.preventDefault();
    handleKey("back");
  } else if (event.key === "Enter") {
    event.preventDefault();
    handleKey("enter");
  }
});

load();
renderHome();
