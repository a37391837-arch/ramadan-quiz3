/* script.js مصحح ومستقر
   - يدعم فردي وجماعي
   - حد أقصى للأسئلة 300
   - عداد وقت لكل سؤال (اختياري)
   - أصوات اختيارية (assets/)
   - يعمل بعد DOMContentLoaded
*/

const MAX_QUESTIONS_ALLOWED = 300;

const state = {
  mode: null,
  questions: [],
  shuffled: [],
  currentIndex: 0,
  maxQuestions: 0,
  players: [],
  scores: [],
  currentPlayer: 0,
  timePerQuestion: 0,
  timer: null,
  timeRemaining: 0
};

document.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  bindUI();
  hideAllScreens();
  showScreen("main-menu");
  loadQuestions();
});

/* ---------- عناصر DOM مخزنة ---------- */
let DOM = {};
function cacheElements() {
  const ids = ["main-menu","single-settings","players-count-screen","players-names-screen","quiz","result-screen",
               "question","options","score","current-player","timer","time","players-inputs","final-results"];
  ids.forEach(id => DOM[id] = document.getElementById(id));
  DOM.btnStartSingle = document.getElementById("btn-start-single");
  DOM.btnStartMulti = document.getElementById("btn-start-multi");
  DOM.singleStart = document.getElementById("single-start");
  DOM.singleBack = document.getElementById("single-back");
  DOM.playersNext = document.getElementById("players-next");
  DOM.playersBack = document.getElementById("players-back");
  DOM.multiStart = document.getElementById("multi-start");
  DOM.namesBack = document.getElementById("names-back");
  DOM.endGame = document.getElementById("end-game");
  DOM.backToMenu = document.getElementById("back-to-menu");
}

/* ---------- ربط الأحداث ---------- */
function bindUI() {
  if (DOM.btnStartSingle) DOM.btnStartSingle.addEventListener("click", showSingleSettings);
  if (DOM.btnStartMulti) DOM.btnStartMulti.addEventListener("click", showPlayersCount);
  if (DOM.singleStart) DOM.singleStart.addEventListener("click", startSingleGame);
  if (DOM.singleBack) DOM.singleBack.addEventListener("click", () => showScreen("main-menu"));
  if (DOM.playersNext) DOM.playersNext.addEventListener("click", showPlayersNames);
  if (DOM.playersBack) DOM.playersBack.addEventListener("click", () => showScreen("main-menu"));
  if (DOM.multiStart) DOM.multiStart.addEventListener("click", startMultiGame);
  if (DOM.namesBack) DOM.namesBack.addEventListener("click", () => showScreen("players-count-screen"));
  if (DOM.endGame) DOM.endGame.addEventListener("click", endGameEarly);
  if (DOM.backToMenu) DOM.backToMenu.addEventListener("click", () => showScreen("main-menu"));
}

/* ---------- تحميل الأسئلة ---------- */
async function loadQuestions() {
  try {
    const res = await fetch("questions.txt");
    if (!res.ok) throw new Error("فشل تحميل questions.txt: " + res.status);
    const text = await res.text();
    state.questions = parseQuestions(text);
    console.log("تم تحميل الأسئلة:", state.questions.length);
  } catch (e) {
    console.error(e);
    alert("فشل تحميل ملف الأسئلة. شغّل المشروع عبر سيرفر محلي وتأكد من وجود questions.txt.");
  }
}

function parseQuestions(text) {
  if (!text) return [];
  return text.trim().split("\n").map(line => {
    const parts = line.split("|");
    return {
      question: (parts[0] || "").trim(),
      options: (parts[1] || "").split(",").map(s => s.trim()),
      answer: parseInt(parts[2], 10)
    };
  }).filter(q => q.question && q.options.length >= 2 && Number.isInteger(q.answer));
}

/* ---------- شاشات ---------- */
function hideAllScreens() {
  document.querySelectorAll(".screen").forEach(s => s.classList.add("hidden"));
}
function showScreen(id) {
  hideAllScreens();
  const el = document.getElementById(id);
  if (el) el.classList.remove("hidden");
}

/* ---------- مساعدة: تطبيع عدد الأسئلة ---------- */
function normalizeQuestionCount(requested) {
  if (!Number.isInteger(requested) || requested < 1) return 1;
  if (requested > MAX_QUESTIONS_ALLOWED) {
    alert("الحد الأقصى لعدد الأسئلة هو 300. سيتم استخدام 300 سؤالاً.");
    return MAX_QUESTIONS_ALLOWED;
  }
  return requested;
}

/* ---------- إعدادات الفردي ---------- */
function showSingleSettings() { showScreen("single-settings"); }

function startSingleGame() {
  unlockAudio();
  const rawQCount = parseInt(document.getElementById("single-question-count").value) || 0;
  const qCount = normalizeQuestionCount(rawQCount);
  const timeLimit = parseInt(document.getElementById("single-time-limit").value) || 0;

  state.mode = "single";
  state.maxQuestions = Math.min(qCount, state.questions.length || qCount);
  state.shuffled = shuffleArray([...state.questions]).slice(0, state.maxQuestions);
  state.players = ["اللاعب"];
  state.scores = [0];
  state.currentIndex = 0;
  state.currentPlayer = 0;
  state.timePerQuestion = (Number.isInteger(timeLimit) && timeLimit >= 0) ? timeLimit : 0;

  showScreen("quiz");
  loadQuestion();
}

/* ---------- إعدادات الجماعي ---------- */
function showPlayersCount() { showScreen("players-count-screen"); }

function showPlayersNames() {
  const count = parseInt(document.getElementById("players-count").value);
  const rawQCount = parseInt(document.getElementById("multi-question-count").value) || 0;
  const qCount = normalizeQuestionCount(rawQCount);
  const timePerQ = parseInt(document.getElementById("multi-time-per-question").value) || 0;

  if (!Number.isInteger(count) || count < 2) { alert("أدخل عدد لاعبين صحيح (2 أو أكثر)."); return; }

  const inputsDiv = DOM["players-inputs"];
  inputsDiv.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "اسم اللاعب " + (i + 1);
    input.id = "player-" + i;
    inputsDiv.appendChild(input);
  }

  const screen = DOM["players-names-screen"];
  screen.dataset.qcount = qCount;
  screen.dataset.timeperq = Number.isInteger(timePerQ) && timePerQ >= 0 ? timePerQ : 0;
  showScreen("players-names-screen");
}

function startMultiGame() {
  unlockAudio();
  const inputsDiv = DOM["players-inputs"];
  const children = inputsDiv.children;
  const qCount = parseInt(document.getElementById("players-names-screen").dataset.qcount) || 0;
  const timePerQ = parseInt(document.getElementById("players-names-screen").dataset.timeperq) || 0;

  if (children.length < 2) { alert("عدد اللاعبين غير صحيح."); return; }

  state.players = [];
  state.scores = [];
  for (let i = 0; i < children.length; i++) {
    const name = children[i].value ? children[i].value.trim() : "";
    state.players.push(name || ("لاعب " + (i + 1)));
    state.scores.push(0);
  }

  state.mode = "multi";
  state.maxQuestions = Math.min(qCount, state.questions.length || qCount);
  state.shuffled = shuffleArray([...state.questions]).slice(0, state.maxQuestions);
  state.currentIndex = 0;
  state.currentPlayer = 0;
  state.timePerQuestion = timePerQ;

  showScreen("quiz");
  loadQuestion();
}

/* ---------- وظائف اللعبة ---------- */
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function resetTransientState() {
  clearInterval(state.timer);
  state.timer = null;
  state.timeRemaining = 0;
  document.querySelectorAll(".option").forEach(btn => btn.onclick = null);
}

function startQuestionTimer() {
  clearInterval(state.timer);
  if (!state.timePerQuestion || state.timePerQuestion <= 0) {
    if (DOM.timer) DOM.timer.classList.add("hidden");
    state.timeRemaining = 0;
    return;
  }
  state.timeRemaining = state.timePerQuestion;
  if (DOM.timer) DOM.timer.classList.remove("hidden");
  if (DOM.time) DOM.time.textContent = state.timeRemaining;
  state.timer = setInterval(() => {
    state.timeRemaining--;
    if (DOM.time) DOM.time.textContent = state.timeRemaining;
    if (state.timeRemaining <= 0) {
      clearInterval(state.timer);
      handleTimeout();
    }
  }, 1000);
}

function handleTimeout() {
  setTimeout(() => nextTurn(), 400);
}

function loadQuestion() {
  resetTransientState();
  if (!state.shuffled || state.shuffled.length === 0) {
    showFinalResults();
    return;
  }
  if (state.currentIndex >= state.shuffled.length) {
    showFinalResults();
    return;
  }

  const q = state.shuffled[state.currentIndex];
  if (DOM.question) DOM.question.textContent = q.question || "سؤال غير متوفر";
  if (DOM["current-player"]) DOM["current-player"].textContent = state.mode === "multi" ? "هذا السؤال موجه إلى: " + state.players[state.currentPlayer] : "";

  const optionsDiv = DOM.options;
  optionsDiv.innerHTML = "";
  q.options.forEach((opt, i) => {
    const btn = document.createElement("div");
    btn.className = "option";
    btn.textContent = opt;
    btn.onclick = () => handleAnswer(btn, i, q.answer);
    optionsDiv.appendChild(btn);
  });

  updateScoreDisplay();
  document.querySelectorAll('.btn-primary').forEach(b => { b.classList.add('pulse'); setTimeout(()=> b.classList.remove('pulse'), 1600); });
  startQuestionTimer();
}

function handleAnswer(element, index, correctAnswer) {
  document.querySelectorAll(".option").forEach(btn => btn.onclick = null);
  if (index === correctAnswer) {
    element.classList.add("correct");
    const idx = state.mode === "multi" ? state.currentPlayer : 0;
    state.scores[idx] = (state.scores[idx] || 0) + 1;
    playSound("correct");
  } else {
    element.classList.add("wrong");
    playSound("wrong");
  }
  setTimeout(() => nextTurn(), 700);
}

function nextTurn() {
  clearInterval(state.timer);
  state.currentIndex++;
  if (state.mode === "multi") state.currentPlayer = (state.currentPlayer + 1) % state.players.length;
  loadQuestion();
}

function updateScoreDisplay() {
  const scoreDiv = DOM.score;
  if (!scoreDiv) return;
  if (state.mode === "multi") {
    const parts = state.players.map((p, i) => `${p}: ${state.scores[i]}`);
    scoreDiv.textContent = "النتيجة: " + parts.join(" | ");
  } else {
    scoreDiv.textContent = "النتيجة: " + (state.scores[0] || 0);
  }
}

/* ---------- إنهاء وإظهار النتائج ---------- */
function endGameEarly() {
  if (!confirm("هل تريد إنهاء اللعبة الآن؟")) return;
  showFinalResults();
}

function showFinalResults() {
  resetTransientState();
  showScreen("result-screen");
  const resultsDiv = DOM["final-results"];
  if (!resultsDiv) return;
  resultsDiv.innerHTML = "";

  const playersList = state.players;
  const scoresList = state.scores;
  const sorted = playersList.map((p, i) => ({ name: p, score: scoresList[i] || 0 }))
                            .sort((a, b) => b.score - a.score);

  sorted.forEach((pl, idx) => {
    const p = document.createElement("p");
    p.textContent = `${idx + 1}. ${pl.name} — ${pl.score} نقطة`;
    resultsDiv.appendChild(p);
  });

  const first = resultsDiv.querySelector('p');
  if (first) first.classList.add('winner');
  playSound("winner");
}

/* ---------- أصوات ---------- */
function playSound(type) {
  try {
    let s = null;
    if (type === "correct") s = document.getElementById("sound-correct");
    else if (type === "wrong") s = document.getElementById("sound-wrong");
    else if (type === "winner") s = document.getElementById("sound-winner");
    if (!s) return;
    s.currentTime = 0;
    s.volume = 1;
    s.play().catch(err => console.warn("Audio play blocked:", err));
  } catch (e) { console.warn("playSound error:", e); }
}

function unlockAudio() {
  try {
    ["sound-correct","sound-wrong","sound-winner"].forEach(id => {
      const s = document.getElementById(id);
      if (s) s.play().then(()=>{ s.pause(); s.currentTime = 0; }).catch(()=>{});
    });
  } catch(e){}
}
