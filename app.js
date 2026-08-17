const STORAGE_KEY = "mathtizzy-progress";
const USERS_KEY = "mathtizzy-users";
const NAME_MAX = 18;
const FACT_RETRY_AFTER = 2;
const FAST_SEC_MIN = 2;
const FAST_SEC_MAX = 5;
const FAST_SEC_DEFAULT = 3;
const FACT_SLOW_MS = 8000;
const FACT_TIME_CAP_MS = 20000;
const SLOW_BUMP_SEC = 0.1;
const SLOW_BUMP_STREAK = 4;
const SLOW_BUMP_MIN_RIGHTS = 8;
const SLOW_BUMP_COOLDOWN = 6;
const SLOW_NEAR_RATIO = 0.9;
const FACT_RED = [231, 111, 81];
const FACT_MID = [244, 208, 96];
const FACT_GREEN = [42, 157, 143];
const OP_TITLES = { "+": "Addition", "-": "Subtraction", "×": "Multiplication", "÷": "Division" };
const factPoolCache = new Map();

const LEVELS = [
  { name: "Tiny Totals", blurb: "Add numbers up to 5.", ops: ["+"], min: 1, max: 5 },
  { name: "Adding Up", blurb: "Addition facts through 10.", ops: ["+"], min: 1, max: 10 },
  { name: "Take Away", blurb: "Subtraction without negatives.", ops: ["-"], min: 1, max: 10 },
  { name: "Plus & Minus", blurb: "Mix addition and subtraction.", ops: ["+", "-"], min: 1, max: 12 },
  { name: "Times Starter", blurb: "Multiplication facts through 5.", ops: ["×"], min: 1, max: 5 },
  { name: "Times Tables", blurb: "Multiplication facts through 10.", ops: ["×"], min: 1, max: 10 },
  { name: "Fair Shares", blurb: "Division facts with whole-number answers.", ops: ["÷"], min: 1, max: 10 },
  { name: "Fact Mixer", blurb: "All four operations through 12.", ops: ["+", "-", "×", "÷"], min: 1, max: 12 },
  { name: "Bigger Bites", blurb: "Larger addends, still-solid facts.", ops: ["+", "-", "×", "÷"], min: 2, max: 20, mulMax: 12 },
  { name: "Two-Digit Mix", blurb: "Two-digit addition and subtraction.", ops: ["+", "-"], min: 10, max: 50 },
  { name: "Speed Facts", blurb: "Classic facts with a 7-second clock.", ops: ["+", "-", "×", "÷"], min: 1, max: 12, timeLimit: 7 },
  { name: "Mathlete", blurb: "Expert mix. 5 seconds each.", ops: ["+", "-", "×", "÷"], min: 2, max: 20, mulMax: 12, timeLimit: 5 },
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

const SLOW_NOTES = [
  "Right, but a bit slow.",
  "Correct — faster next time.",
  "Yes, but not fast enough.",
  "Got it — pick up the pace.",
  "Right — that was over the limit.",
];

const state = {
  userId: null,
  userName: "",
  levelIndex: 0,
  streak: 0,
  bestStreak: 0,
  correct: 0,
  attempted: 0,
  sound: true,
  fastSeconds: FAST_SEC_DEFAULT,
  heldAtLevel: false,
  input: "",
  problem: null,
  locked: false,
  timerId: null,
  remaining: null,
  timerPaused: false,
  pausedAt: 0,
  lastPraise: "",
  shownAt: 0,
  slowRun: 0,
  attemptsSinceBump: 0,
  factScores: {},
  retrySoon: [],
};

const els = {
  loginScreen: document.getElementById("loginScreen"),
  userList: document.getElementById("userList"),
  loginForm: document.getElementById("loginForm"),
  userNameInput: document.getElementById("userNameInput"),
  homeScreen: document.getElementById("homeScreen"),
  playScreen: document.getElementById("playScreen"),
  homeEyebrow: document.getElementById("homeEyebrow"),
  homeStats: document.getElementById("homeStats"),
  homeLevel: document.getElementById("homeLevel"),
  homeStreak: document.getElementById("homeStreak"),
  homeSolved: document.getElementById("homeSolved"),
  startBtn: document.getElementById("startBtn"),
  resetBtn: document.getElementById("resetBtn"),
  homeSettingsBtn: document.getElementById("homeSettingsBtn"),
  switchUserBtn: document.getElementById("switchUserBtn"),
  homeBtn: document.getElementById("homeBtn"),
  settingsBtn: document.getElementById("settingsBtn"),
  soundBtn: document.getElementById("soundBtn"),
  levelKicker: document.getElementById("levelKicker"),
  levelName: document.getElementById("levelName"),
  masteryBar: document.getElementById("masteryBar"),
  masteryFill: document.getElementById("masteryFill"),
  masteryLabel: document.getElementById("masteryLabel"),
  factsWrap: document.getElementById("factsWrap"),
  factsBtn: document.getElementById("factsBtn"),
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
  resetUserName: document.getElementById("resetUserName"),
  settingsOverlay: document.getElementById("settingsOverlay"),
  fastSlider: document.getElementById("fastSlider"),
  fastSliderValue: document.getElementById("fastSliderValue"),
  settingsDoneBtn: document.getElementById("settingsDoneBtn"),
};

function clampFastSeconds(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return FAST_SEC_DEFAULT;
  return Math.min(FAST_SEC_MAX, Math.max(FAST_SEC_MIN, Math.round(n * 100) / 100));
}

function formatSeconds(seconds) {
  return clampFastSeconds(seconds).toFixed(2);
}

function fastMs() {
  return state.fastSeconds * 1000;
}

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
  if (isFactGreen(stats)) return 0.06;
  if (!stats || (!stats.right && !stats.wrong)) return 12;
  if (!stats.right) return 16 + stats.wrong * 3;
  const avg = factAvgMs(stats);
  const over = avg == null ? 0 : Math.max(0, (avg - fastMs()) / fastMs());
  return 12 + stats.wrong + Math.min(8, over * 4);
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
  const { min, max } = mapRange(level, op);
  const cacheKey = `${op}:${min}:${max}`;
  if (factPoolCache.has(cacheKey)) return factPoolCache.get(cacheKey);

  const pool = [];
  for (let row = min; row <= max; row += 1) {
    for (let col = min; col <= max; col += 1) {
      if (op === "-" && row < col) continue;
      if (op === "÷") {
        pool.push({ a: row * col, b: col, op, answer: row });
      } else if (op === "×") {
        pool.push({ a: row, b: col, op, answer: row * col });
      } else if (op === "+") {
        pool.push({ a: row, b: col, op, answer: row + col });
      } else {
        pool.push({ a: row, b: col, op, answer: row - col });
      }
    }
  }
  factPoolCache.set(cacheKey, pool);
  return pool;
}

function getLevelFacts(level) {
  return level.ops.flatMap((op) => getFactPool(level, op));
}

function isFactGreen(stats) {
  const avg = factAvgMs(stats);
  return avg != null && avg <= fastMs();
}

function levelMastery(level) {
  const facts = getLevelFacts(level);
  const total = facts.length;
  let green = 0;
  for (const fact of facts) {
    if (isFactGreen(state.factScores[factKey(fact)])) green += 1;
  }
  const percent = !total ? 0 : green >= total ? 100 : Math.min(99, Math.round((green / total) * 100));
  return { green, total, percent };
}

function pickWeightedFact(level) {
  const pool = getLevelFacts(level);
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

function overallCorrectAvgMs() {
  let totalMs = 0;
  let totalRight = 0;
  for (const stats of Object.values(state.factScores)) {
    if (!stats || !stats.right) continue;
    totalMs += stats.correctMs;
    totalRight += stats.right;
  }
  if (totalRight < SLOW_BUMP_MIN_RIGHTS) return null;
  return totalMs / totalRight;
}

function maybeEaseTimeLimit() {
  if (state.fastSeconds >= FAST_SEC_MAX) return false;
  if (state.slowRun < SLOW_BUMP_STREAK) return false;
  if (state.attemptsSinceBump < SLOW_BUMP_COOLDOWN) return false;
  const avg = overallCorrectAvgMs();
  if (avg == null || avg < fastMs() * SLOW_NEAR_RATIO) return false;
  const next = clampFastSeconds(state.fastSeconds + SLOW_BUMP_SEC);
  if (next <= state.fastSeconds) return false;
  state.fastSeconds = next;
  state.slowRun = 0;
  state.attemptsSinceBump = 0;
  state.heldAtLevel = false;
  return true;
}

function slowNoteFor(elapsedMs) {
  const options = SLOW_NOTES.filter((line) => line !== state.lastPraise);
  const line = pick(options.length ? options : SLOW_NOTES);
  state.lastPraise = line;
  const took = (elapsedMs / 1000).toFixed(2);
  return `${line} ${took}s — aim for ${formatSeconds(state.fastSeconds)}s.`;
}

function currentLevel() {
  return LEVELS[Math.min(state.levelIndex, LEVELS.length - 1)];
}

function mulMax(level) {
  return level.mulMax ?? level.max;
}

function generateProblem() {
  const level = currentLevel();
  const retry = takeDueRetry(level);
  if (retry) return retry;

  let next = pickWeightedFact(level);
  for (let i = 0; i < 8; i += 1) {
    if (!sameProblem(next, state.problem)) break;
    next = pickWeightedFact(level);
  }
  if (isAddOrSub(next.op)) dequeueRetry(next);
  return next;
}

function progressKey(userId) {
  return `${STORAGE_KEY}:${userId}`;
}

function makeUserId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `u${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeName(raw) {
  return String(raw || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, NAME_MAX);
}

function namesMatch(left, right) {
  return left.toLowerCase() === right.toLowerCase();
}

function freshProgress() {
  return {
    levelIndex: 0,
    streak: 0,
    bestStreak: 0,
    correct: 0,
    attempted: 0,
    sound: true,
    fastSeconds: FAST_SEC_DEFAULT,
    heldAtLevel: false,
    slowRun: 0,
    attemptsSinceBump: 0,
    factScores: {},
    retrySoon: [],
  };
}

function clearSession() {
  clearTimer();
  Object.assign(state, {
    input: "",
    problem: null,
    locked: false,
    remaining: null,
    timerPaused: false,
    pausedAt: 0,
    lastPraise: "",
    shownAt: 0,
  });
}

function applyProgress(data = {}) {
  const defaults = freshProgress();
  Object.assign(state, defaults, {
    levelIndex: data.levelIndex ?? 0,
    streak: data.streak ?? 0,
    bestStreak: data.bestStreak ?? 0,
    correct: data.correct ?? 0,
    attempted: data.attempted ?? 0,
    sound: data.sound ?? true,
    fastSeconds: clampFastSeconds(data.fastSeconds ?? FAST_SEC_DEFAULT),
    heldAtLevel: data.heldAtLevel ?? false,
    slowRun: Number(data.slowRun) || 0,
    attemptsSinceBump: Number(data.attemptsSinceBump) || 0,
    factScores: normalizeFactScores(data.factScores),
    retrySoon: Array.isArray(data.retrySoon) ? data.retrySoon : [],
  });
  clearSession();
}

function readUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    const list = Array.isArray(data) ? data : data.users;
    if (!Array.isArray(list)) return [];
    return list
      .filter((user) => user && user.id && user.name)
      .map((user) => ({ id: String(user.id), name: normalizeName(user.name) }))
      .filter((user) => user.name);
  } catch {
    return [];
  }
}

function writeUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function readProgress(userId) {
  try {
    const raw = localStorage.getItem(progressKey(userId));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function takeLegacyProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    localStorage.removeItem(STORAGE_KEY);
    return data && typeof data === "object" ? data : null;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function progressSnapshot() {
  return {
    levelIndex: state.levelIndex,
    streak: state.streak,
    bestStreak: state.bestStreak,
    correct: state.correct,
    attempted: state.attempted,
    sound: state.sound,
    fastSeconds: state.fastSeconds,
    heldAtLevel: state.heldAtLevel,
    slowRun: state.slowRun,
    attemptsSinceBump: state.attemptsSinceBump,
    factScores: state.factScores,
    retrySoon: state.retrySoon,
  };
}

function save() {
  if (!state.userId) return;
  localStorage.setItem(progressKey(state.userId), JSON.stringify(progressSnapshot()));
}

function showScreen(name) {
  els.loginScreen.classList.toggle("is-active", name === "login");
  els.homeScreen.classList.toggle("is-active", name === "home");
  els.playScreen.classList.toggle("is-active", name === "play");
}

function userSummary(user) {
  const progress = readProgress(user.id) ?? freshProgress();
  const level = LEVELS[Math.min(progress.levelIndex ?? 0, LEVELS.length - 1)];
  const solved = progress.correct ?? 0;
  if (!solved && !progress.levelIndex) return "New player";
  return `${level.name} · ${solved} solved`;
}

function renderLogin() {
  const users = readUsers();
  els.userList.hidden = !users.length;
  els.userList.replaceChildren(
    ...users.map((user) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "user-btn";
      button.dataset.userId = user.id;
      const name = document.createElement("strong");
      name.textContent = user.name;
      const meta = document.createElement("span");
      meta.textContent = userSummary(user);
      button.append(name, meta);
      return button;
    })
  );
  els.userNameInput.value = "";
}

function loginAs(user, progress) {
  state.userId = user.id;
  state.userName = user.name;
  applyProgress(progress ?? readProgress(user.id) ?? {});
  renderHome();
  showScreen("home");
}

function loginFromName(raw) {
  const name = normalizeName(raw);
  if (!name) {
    els.userNameInput.focus();
    return;
  }
  const users = readUsers();
  const existing = users.find((user) => namesMatch(user.name, name));
  if (existing) {
    loginAs(existing);
    return;
  }
  const user = { id: makeUserId(), name };
  const legacy = users.length ? null : takeLegacyProgress();
  writeUsers([...users, user]);
  if (legacy) localStorage.setItem(progressKey(user.id), JSON.stringify(legacy));
  loginAs(user, legacy);
}

function switchUser() {
  save();
  clearSession();
  state.userId = null;
  state.userName = "";
  renderLogin();
  showScreen("login");
  els.userNameInput.focus();
}

function accuracyText() {
  if (!state.attempted) return "—";
  return `${Math.round((state.correct / state.attempted) * 100)}%`;
}

function playerLevelLabel() {
  const levelNo = Math.min(state.levelIndex + 1, LEVELS.length);
  return state.userName ? `${state.userName} Level ${levelNo}` : `Level ${levelNo}`;
}

function renderHome() {
  const hasProgress = state.attempted > 0 || state.levelIndex > 0;
  els.homeEyebrow.textContent = playerLevelLabel();
  els.homeStats.hidden = !hasProgress;
  els.resetBtn.hidden = !hasProgress;
  els.homeLevel.textContent = String(Math.min(state.levelIndex + 1, LEVELS.length));
  els.homeStreak.textContent = String(state.bestStreak);
  els.homeSolved.textContent = String(state.correct);
  els.startBtn.textContent = hasProgress ? "Continue practicing" : "Start practicing";
  els.resetUserName.textContent = state.userName || "this player";
  updateSoundButton();
}

function updateSoundButton() {
  els.soundBtn.setAttribute("aria-pressed", String(state.sound));
  els.soundBtn.textContent = state.sound ? "♪" : "🔇";
}

function renderPlayHud() {
  const level = currentLevel();
  const { green, total, percent } = levelMastery(level);
  els.levelKicker.textContent = playerLevelLabel();
  els.levelName.textContent = level.name;
  els.masteryFill.style.width = `${percent}%`;
  els.masteryBar.setAttribute("aria-valuenow", String(percent));
  els.masteryLabel.textContent = total ? `Mastery ${green}/${total}` : "Mastery 0%";
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
  const t = 1 - (avg - fastMs()) / (FACT_SLOW_MS - fastMs());
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
  syncFactsTimer();
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

function problemElapsedMs() {
  let elapsed = state.shownAt ? performance.now() - state.shownAt : 0;
  if (state.timerPaused && state.pausedAt) elapsed -= performance.now() - state.pausedAt;
  return Math.max(0, elapsed);
}

function pauseClocks() {
  if (state.locked || state.timerPaused) return;
  state.timerPaused = true;
  state.pausedAt = performance.now();
  clearTimer();
}

function resumeCountdown() {
  const level = currentLevel();
  if (
    !level.timeLimit ||
    state.locked ||
    state.timerPaused ||
    !els.playScreen.classList.contains("is-active") ||
    !els.overlay.hidden ||
    !els.settingsOverlay.hidden ||
    !els.resetOverlay.hidden ||
    state.timerId ||
    state.remaining == null ||
    state.remaining <= 0
  ) {
    return;
  }
  els.timerValue.textContent = `${state.remaining}s`;
  state.timerId = window.setInterval(() => {
    if (state.timerPaused || state.locked) return;
    state.remaining -= 1;
    els.timerValue.textContent = `${Math.max(state.remaining, 0)}s`;
    if (state.remaining <= 0) {
      clearTimer();
      grade(null);
    }
  }, 1000);
}

function resumeClocks() {
  if (!state.timerPaused) return;
  if (state.pausedAt && state.shownAt) {
    state.shownAt += performance.now() - state.pausedAt;
  }
  state.timerPaused = false;
  state.pausedAt = 0;
  if (!state.locked) resumeCountdown();
}

function syncFactsTimer() {
  if (factsPopOpen()) pauseClocks();
  else resumeClocks();
}

function startTimer() {
  clearTimer();
  state.timerPaused = false;
  state.pausedAt = 0;
  const level = currentLevel();
  if (!level.timeLimit) {
    els.timerValue.textContent = "—";
    if (factsPopOpen() || !els.settingsOverlay.hidden) pauseClocks();
    return;
  }
  state.remaining = level.timeLimit;
  els.timerValue.textContent = `${state.remaining}s`;
  if (factsPopOpen() || !els.settingsOverlay.hidden) {
    pauseClocks();
    return;
  }
  resumeCountdown();
}

function nextProblem() {
  state.locked = false;
  state.input = "";
  state.problem = generateProblem();
  state.shownAt = performance.now();
  els.problemCard.classList.remove("is-correct", "is-slow", "is-wrong");
  els.feedback.textContent = "";
  renderPlayHud();
  renderProblem();
  startTimer();
}

function showOverlay({ title, blurb, stayNote = "", eyebrow = "Mastered", continueLabel = "Level up", stayLabel = "Stay here", canStay = true }) {
  setFactsOpen(false);
  els.settingsOverlay.hidden = true;
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
  const { green, total } = levelMastery(level);
  if (!total || green < total) {
    state.heldAtLevel = false;
    return;
  }
  if (state.heldAtLevel) return;

  if (state.levelIndex >= LEVELS.length - 1) {
    showOverlay({
      eyebrow: "Champion",
      title: "You finished the ladder",
      blurb: "Every Mathlete fact is in the green. Keep practicing mixed, timed facts, or reset if you want a fresh grid.",
      continueLabel: "Keep practicing",
      canStay: false,
    });
    save();
    return;
  }

  const next = LEVELS[state.levelIndex + 1];
  showOverlay({
    title: level.name,
    blurb: `Every fact is in the green. Level up to ${next.name}: ${next.blurb} Or stay here and keep practicing.`,
    stayNote: `Stay on ${level.name}: ${level.blurb}`,
  });
  save();
}

function grade(rawAnswer) {
  if (state.locked || !state.problem) return;
  state.locked = true;
  clearTimer();

  const correct = rawAnswer === state.problem.answer;
  const elapsedMs = problemElapsedMs();
  const slow = correct && elapsedMs > fastMs();
  state.attempted += 1;
  state.attemptsSinceBump += 1;
  recordFact(state.problem, correct, elapsedMs);
  els.problemCard.classList.toggle("is-correct", correct && !slow);
  els.problemCard.classList.toggle("is-slow", slow);
  els.problemCard.classList.toggle("is-wrong", !correct);
  beep(correct);

  if (correct) {
    state.correct += 1;
    state.streak += 1;
    state.bestStreak = Math.max(state.bestStreak, state.streak);
    if (slow) {
      state.slowRun += 1;
      const eased = maybeEaseTimeLimit();
      els.feedback.textContent = eased
        ? `Right, but a bit slow. Limit eased to ${formatSeconds(state.fastSeconds)}s.`
        : slowNoteFor(elapsedMs);
    } else {
      state.slowRun = 0;
      els.feedback.textContent = praiseFor(state.streak);
    }
  } else {
    state.streak = 0;
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
  }, slow ? 1600 : correct ? 450 : 2200);
}

function submit() {
  if (!state.input) return;
  grade(Number(state.input));
}

function handleKey(key) {
  if (
    !els.playScreen.classList.contains("is-active") ||
    state.locked ||
    !els.overlay.hidden ||
    !els.settingsOverlay.hidden ||
    !els.resetOverlay.hidden
  ) {
    return;
  }
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
els.switchUserBtn.addEventListener("click", switchUser);
els.userList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-user-id]");
  if (!button) return;
  const user = readUsers().find((item) => item.id === button.dataset.userId);
  if (user) loginAs(user);
});
els.loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  loginFromName(els.userNameInput.value);
});
els.homeBtn.addEventListener("click", () => {
  clearTimer();
  showScreen("home");
  setFactsOpen(false);
  renderHome();
});
els.factsWrap.addEventListener("mouseenter", () => {
  renderFactsMap();
  syncFactsTimer();
});
els.factsWrap.addEventListener("mouseleave", syncFactsTimer);
els.factsWrap.addEventListener("focusin", () => {
  renderFactsMap();
  syncFactsTimer();
});
els.factsWrap.addEventListener("focusout", () => {
  window.setTimeout(syncFactsTimer, 0);
});
els.factsBtn.addEventListener("click", (event) => {
  event.stopPropagation();
  if (window.matchMedia("(hover: hover)").matches) {
    renderFactsMap();
    syncFactsTimer();
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
  const sound = state.sound;
  const fastSeconds = state.fastSeconds;
  applyProgress({ ...freshProgress(), sound, fastSeconds });
  save();
  hideResetConfirm();
  renderHome();
}

els.resetBtn.addEventListener("click", showResetConfirm);
els.resetCancelBtn.addEventListener("click", hideResetConfirm);
els.resetConfirmBtn.addEventListener("click", resetProgress);
function fastSecondsLabel(seconds) {
  return `${formatSeconds(seconds)} seconds`;
}

function syncSettingsForm() {
  els.fastSlider.value = String(state.fastSeconds);
  els.fastSliderValue.textContent = fastSecondsLabel(state.fastSeconds);
}

function showSettings() {
  setFactsOpen(false);
  pauseClocks();
  syncSettingsForm();
  els.settingsOverlay.hidden = false;
  els.fastSlider.focus();
}

function hideSettings() {
  if (els.settingsOverlay.hidden) return;
  els.settingsOverlay.hidden = true;
  if (els.playScreen.classList.contains("is-active") && els.overlay.hidden) {
    renderPlayHud();
    syncFactsTimer();
  }
}

function applyFastSeconds(value) {
  const next = clampFastSeconds(value);
  if (next === state.fastSeconds) {
    syncSettingsForm();
    return;
  }
  state.fastSeconds = next;
  state.heldAtLevel = false;
  state.slowRun = 0;
  state.attemptsSinceBump = 0;
  syncSettingsForm();
  save();
  if (els.playScreen.classList.contains("is-active")) renderPlayHud();
}

els.homeSettingsBtn.addEventListener("click", showSettings);
els.settingsBtn.addEventListener("click", showSettings);
els.settingsDoneBtn.addEventListener("click", hideSettings);
els.settingsOverlay.addEventListener("click", (event) => {
  if (event.target === els.settingsOverlay) hideSettings();
});
els.fastSlider.addEventListener("input", (event) => {
  applyFastSeconds(event.target.value);
});
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
    state.heldAtLevel = false;
  } else {
    state.heldAtLevel = true;
  }
  save();
  hideLevelOverlay();
}

function stayAtLevel() {
  if (els.overlay.hidden || els.overlayStay.hidden) return;
  state.heldAtLevel = true;
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
  if (!els.settingsOverlay.hidden) {
    if (event.key === "Escape" || event.key === "Enter") {
      event.preventDefault();
      hideSettings();
    }
    return;
  }
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
  if (!els.playScreen.classList.contains("is-active")) return;
  if (event.key >= "0" && event.key <= "9") handleKey(event.key);
  else if (event.key === "Backspace") {
    event.preventDefault();
    handleKey("back");
  } else if (event.key === "Enter") {
    event.preventDefault();
    handleKey("enter");
  }
});

renderLogin();
showScreen("login");
