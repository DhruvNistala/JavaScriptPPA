/* ===== API LAYER =====
 * All server calls go through api(). Token is read from localStorage each time
 * so it stays in sync without passing it around. 401 → back to login.
 */
async function api(method, endpoint, body) {
  const opts = { method, headers: { "Content-Type": "application/json" } };
  const token = localStorage.getItem("thrive_token");
  if (token) opts.headers["Authorization"] = "Bearer " + token;
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res  = await fetch(endpoint, opts);
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) { localStorage.removeItem("thrive_token"); showScreen("screen-login"); throw new Error("Session expired"); }
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

/* ===== STATE ===== */
const state = {
  selectedGoals: [],
  onboardingInfo: {},
  checkInMood: "",
  workoutRunning: false,
  workoutInterval: null,
  totalElapsed: 0,
  currentExerciseIndex: 0,
  exerciseTimeLeft: 60,
  exerciseDuration: 60,
  workoutName: "Cardio & Strength",
  hrInterval: null,
  allWorkouts: [],      // cache for history filtering
  currentExerciseId: null,
};

const KCAL_GOAL = 1450;

const exercises = [
  { name:"Breathing Focus",      duration:60,  instruction:"Maintain low intensity",     step:"Warm up 1/5" },
  { name:"Lunges",               duration:30,  instruction:"Maintain low intensity",     step:"Warm up 2/5" },
  { name:"Calf Raises",          duration:45,  instruction:"Maintain low intensity",     step:"Warm up 3/5" },
  { name:"Arm Circles",          duration:30,  instruction:"Gentle range of motion",     step:"Warm up 4/5" },
  { name:"Hip Rotations",        duration:30,  instruction:"Maintain low intensity",     step:"Warm up 5/5" },
  { name:"Walking Intervals",    duration:900, instruction:"Moderate pace, stay steady", step:"Cardio 1/1"  },
  { name:"Resistance Band Rows", duration:45,  instruction:"Control the movement",       step:"Strength 1/3"},
  { name:"Seated Leg Press",     duration:45,  instruction:"Full range, controlled",     step:"Strength 2/3"},
  { name:"Cool Down Stretch",    duration:60,  instruction:"Hold each stretch gently",   step:"Cool down 1/1"},
];

const exerciseDatabase = [
  { id:"cycling",      name:"Exercise Bike (Cycling)",  category:"Strength & Resistance", duration:"25–30 min", intensity:"High",          level:"Intermediate",
    desc:"Cycling on a stationary bike builds cardiovascular endurance while being gentle on joints. Ideal for improving heart health without high-impact stress.",
    tags:["cardio","equipment","high intensity","strength"] },
  { id:"yoga-yin",     name:"Yoga Surrender (Yin)",     category:"Yoga",                  duration:"50–60 min", intensity:"Low",           level:"Beginner",
    desc:"Yin yoga involves long-held passive poses that target the connective tissue. Excellent for improving flexibility and reducing stress.",
    tags:["yoga","low intensity","flexibility","bodyweight","no equipment"] },
  { id:"chair",        name:"Chair Exercises",          category:"Strength",              duration:"15–20 min", intensity:"Low",           level:"Beginner",
    desc:"Seated exercises designed for joint protection. Builds lower body and core strength without placing stress on knees or hips.",
    tags:["strength","no equipment","low intensity","bodyweight"] },
  { id:"morning-walk", name:"Morning Walk",             category:"Cardio",                duration:"20–30 min", intensity:"Low–Moderate",  level:"Beginner",
    desc:"A brisk morning walk activates your cardiovascular system, boosts mood, and sets a positive tone for the day.",
    tags:["cardio","walking","low intensity","no equipment"] },
  { id:"resistance",   name:"Resistance Training",      category:"Strength & Resistance", duration:"30–45 min", intensity:"Moderate",      level:"Intermediate",
    desc:"Targeted resistance work using bands or light weights. Builds muscular endurance and supports bone density.",
    tags:["strength","equipment","hypertension focused"] },
  { id:"pilates",      name:"Core Pilates",             category:"Pilates",               duration:"30–45 min", intensity:"Moderate",      level:"Beginner",
    desc:"A controlled movement practice focused on core strength, posture, and breath. Low impact and highly adaptable.",
    tags:["pilates","core","bodyweight","low intensity","no equipment"] },
  { id:"hiit",         name:"HIIT Cardio",              category:"Cardio",                duration:"20–25 min", intensity:"High",          level:"Advanced",
    desc:"Short bursts of maximum-effort exercise followed by brief rest. Maximizes calorie burn and improves aerobic capacity.",
    tags:["cardio","high intensity","bodyweight"] },
  { id:"balance",      name:"Balance & Stability",      category:"Balance",               duration:"15–20 min", intensity:"Low",           level:"Beginner",
    desc:"Exercises to improve proprioception and reduce fall risk. Essential for neurological and joint conditions.",
    tags:["balance","no equipment","low intensity","bodyweight"] },
  { id:"heart-cardio", name:"Heart Health Cardio",      category:"Cardio",                duration:"25–35 min", intensity:"Moderate",      level:"Intermediate",
    desc:"Zone 2 cardiovascular training optimised for hypertension management. Maintains target heart rate to strengthen the cardiac muscle.",
    tags:["cardio","heart exercise","hypertension focused","no equipment"] },
  { id:"stretching",   name:"Full Body Stretching",     category:"Flexibility",           duration:"15–20 min", intensity:"Low",           level:"Beginner",
    desc:"A head-to-toe stretching routine that improves range of motion, reduces post-exercise soreness, and aids recovery.",
    tags:["flexibility","bodyweight","low intensity","no equipment"] },
];

/* ===== NAVIGATION ===== */
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.add("hidden"));
  const target = document.getElementById(id);
  if (target) target.classList.remove("hidden");
  window.scrollTo(0, 0);
}

function enterApp() {
  showScreen("screen-app");
  updateGreeting();
  switchTab("dashboard");
}

function switchTab(tab) {
  document.querySelectorAll(".tab-content").forEach(t => { t.classList.remove("active"); t.style.display = "none"; });
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  const content = document.getElementById(`tab-${tab}`);
  if (content) { content.classList.add("active"); content.style.display = "block"; }
  const nav = document.getElementById(`nav-${tab}`);
  if (nav) nav.classList.add("active");
  if (tab === "dashboard")  loadDashboard();
  if (tab === "progress")   loadProgress();
  if (tab === "nutrition")  loadNutrition();
  if (tab === "profile")    loadProfile();
}

function updateGreeting() {
  const h = new Date().getHours();
  el("greeting-text", h < 12 ? "Good morning," : h < 17 ? "Good afternoon," : "Good evening,");
  el("page-date", new Date().toLocaleDateString("en-US", { weekday:"long", month:"short", day:"numeric" }));
  el("nutrition-date", new Date().toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric" }));
}

/* ===== AUTH ===== */
async function loginUser() {
  const email    = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  const errEl    = document.getElementById("login-error");
  const btn      = document.getElementById("login-btn");
  errEl.classList.add("hidden");
  if (!email || !password) { showAuthError(errEl, "Please enter your email and password."); return; }
  btn.textContent = "Signing in…"; btn.disabled = true;
  try {
    const data = await api("POST", "/api/auth/login", { email, password });
    localStorage.setItem("thrive_token", data.token);
    enterApp();
  } catch (e) {
    showAuthError(errEl, e.message);
  } finally {
    btn.textContent = "Sign In"; btn.disabled = false;
  }
}

async function registerUser() {
  const name     = document.getElementById("reg-name").value.trim();
  const email    = document.getElementById("reg-email").value.trim();
  const password = document.getElementById("reg-password").value;
  const errEl    = document.getElementById("register-error");
  const btn      = document.getElementById("register-btn");
  errEl.classList.add("hidden");
  if (!name || !email || !password) { showAuthError(errEl, "Please fill in all fields."); return; }
  btn.textContent = "Creating account…"; btn.disabled = true;
  try {
    const profileData = {
      name,
      age:       state.onboardingInfo.age       || null,
      sex:       state.onboardingInfo.sex       || null,
      weight:    state.onboardingInfo.weight    || null,
      height:    state.onboardingInfo.height    || null,
      condition: state.onboardingInfo.condition || null,
      medication:state.onboardingInfo.medication|| null,
      goals:     state.selectedGoals,
    };
    const data = await api("POST", "/api/auth/register", { name, email, password });
    localStorage.setItem("thrive_token", data.token);
    // Save onboarding profile data
    await api("PUT", "/api/profile", profileData).catch(() => {});
    enterApp();
  } catch (e) {
    showAuthError(errEl, e.message);
  } finally {
    btn.textContent = "Sign Up"; btn.disabled = false;
  }
}

async function logoutUser() {
  try { await api("POST", "/api/auth/logout"); } catch { /* ok */ }
  localStorage.removeItem("thrive_token");
  showScreen("screen-welcome");
}

function showAuthError(el, msg) {
  el.textContent = msg;
  el.classList.remove("hidden");
}

/* ===== ONBOARDING ===== */
function toggleGoal(btn, goal) {
  btn.classList.toggle("selected");
  if (btn.classList.contains("selected")) state.selectedGoals.push(goal);
  else state.selectedGoals = state.selectedGoals.filter(g => g !== goal);
}

function savePersonalInfo() {
  const age = document.getElementById("input-age").value;
  const sex = document.getElementById("input-sex").value;
  const weight = document.getElementById("input-weight").value;
  const height = document.getElementById("input-height").value;
  if (!age || !sex || !weight || !height) { showToast("Please fill in all fields"); return; }
  state.onboardingInfo = { ...state.onboardingInfo, age, sex, weight, height };
  showScreen("screen-health-condition");
}

/* Pre-collect health info before moving to goals */
document.addEventListener("DOMContentLoaded", () => {
  const nextHealthBtn = document.querySelector("#screen-health-condition .btn-primary");
  if (nextHealthBtn) nextHealthBtn.addEventListener("click", () => {
    state.onboardingInfo.condition  = document.getElementById("input-condition").value;
    state.onboardingInfo.medication = document.getElementById("input-medication").value;
  }, { once: false });
});

/* ===== DASHBOARD ===== */
async function loadDashboard() {
  try {
    const [profile, checkin, workouts] = await Promise.all([
      api("GET", "/api/profile"),
      api("GET", "/api/checkins/latest").catch(() => null),
      api("GET", "/api/workouts"),
    ]);

    // Header
    el("user-name-display", profile.name || "Welcome");

    // Latest recommendation
    if (checkin?.recommendation) {
      el("dash-rec-title", checkin.recommendation.workout);
      const msgEl = document.getElementById("dash-rec-message");
      if (msgEl) msgEl.innerHTML = `<div class="step"><span class="step-dot"></span>${checkin.recommendation.message}</div>`;
    }

    // This week stats
    const weekStart = getWeekStart();
    const thisWeek  = workouts.filter(w => new Date(w.timestamp) >= weekStart);
    const kcal      = thisWeek.reduce((s,w) => s + w.kcalBurned, 0);
    el("dash-kcal",     kcal.toLocaleString() + " kcal");
    el("dash-workouts", thisWeek.length + " sessions");

  } catch (e) {
    console.warn("Dashboard load:", e.message);
  }
}

function setMood(btn, mood) {
  document.querySelectorAll(".checkin-card .mood-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
}

/* ===== CHECK-IN ===== */
function showCheckIn() {
  document.querySelectorAll(".tab-content").forEach(t => { t.classList.remove("active"); t.style.display = "none"; });
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  const tab = document.getElementById("tab-checkin");
  tab.classList.add("active"); tab.style.display = "block";
}

function setCheckInMood(btn, mood) {
  document.querySelectorAll("#tab-checkin .mood-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  state.checkInMood = mood;
}

function updateSlider(type) {
  const slider = document.getElementById(`${type}-slider`);
  const valEl  = document.getElementById(`${type}-val`);
  valEl.textContent = slider.value;
  const pct = (slider.value / 10) * 100;
  slider.style.background = `linear-gradient(to right, var(--accent) ${pct}%, var(--surface-3) ${pct}%)`;
}

/* Primary demo: User → form → fetch POST /api/checkins → server generateRecommendation()
   → saves to checkins.json → returns recommendation → render completion screen */
async function submitCheckIn() {
  if (!state.checkInMood) { showToast("Please select how you are feeling today"); return; }
  const pain     = Number(document.getElementById("pain-slider").value);
  const fatigue  = Number(document.getElementById("fatigue-slider").value);
  const notes    = document.getElementById("checkin-notes").value;
  const symptoms = [...document.querySelectorAll(".symptom-check input:checked")]
    .map(cb => cb.value).filter(v => v !== "none");

  const btn = document.getElementById("checkin-submit-btn");
  btn.textContent = "Saving…"; btn.disabled = true;
  try {
    const checkin = await api("POST", "/api/checkins", { mood:state.checkInMood, pain, fatigue, symptoms, notes });
    renderCheckInComplete(checkin);
    // Reset form
    state.checkInMood = "";
    document.querySelectorAll("#tab-checkin .mood-btn").forEach(b => b.classList.remove("active"));
    document.getElementById("checkin-notes").value = "";
    document.querySelectorAll(".symptom-check input").forEach(cb => cb.checked = false);
  } catch(e) {
    showToast("Could not save: " + e.message);
  } finally {
    btn.textContent = "Submit Check-in"; btn.disabled = false;
  }
}

function renderCheckInComplete(checkin) {
  const rec = checkin.recommendation;
  el("complete-rec-workout", "Recommended: " + rec.workout);
  el("complete-rec-message", rec.message);
  document.querySelectorAll(".tab-content").forEach(t => { t.classList.remove("active"); t.style.display = "none"; });
  const tab = document.getElementById("tab-checkin-complete");
  tab.classList.add("active"); tab.style.display = "block";
}

/* ===== PROGRESS ===== */
async function loadProgress() {
  const histList = document.getElementById("history-list");
  if (histList) histList.innerHTML = `<div class="loading-row">Loading…</div>`;
  try {
    const [workouts, checkin] = await Promise.all([
      api("GET", "/api/workouts"),
      api("GET", "/api/checkins/latest").catch(() => null),
    ]);
    state.allWorkouts = workouts;

    // Update today's recommendation title
    if (checkin?.recommendation) el("progress-rec-title", checkin.recommendation.workout);

    renderWeeklySummary(workouts);
    renderWeekChart(workouts);
    renderWorkoutHistory(workouts);
  } catch(e) {
    if (histList) histList.innerHTML = `<div class="loading-row error">Failed to load</div>`;
  }
}

function getWeekStart() {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0,0,0,0);
  return d;
}

function renderWeeklySummary(workouts) {
  const ws       = getWeekStart();
  const week     = workouts.filter(w => new Date(w.timestamp) >= ws);
  const mins     = week.reduce((s,w) => s + Math.round(w.duration/60), 0);
  const kcal     = week.reduce((s,w) => s + w.kcalBurned, 0);
  const goalMins = 150;
  const goalPct  = Math.min(100, Math.round((mins/goalMins)*100));

  // Weekly goal ring
  setRing("weekly-progress-ring", goalPct/100, 201.06);
  el("weekly-goal-pct-label", goalPct + "%");

  // Summary stat rings
  setRing("ring-workouts", Math.min(week.length/5, 1), 163.4);
  setRing("ring-minutes",  Math.min(mins/goalMins, 1), 163.4);
  setRing("ring-kcal",     Math.min(kcal/1000, 1),     163.4);

  // Streak: how many consecutive days have at least one workout
  const streak = calcStreak(workouts);
  setRing("ring-streak", Math.min(streak/7, 1), 163.4);

  el("summary-workouts", week.length);
  el("summary-minutes",  mins);
  el("summary-kcal",     kcal);
  el("summary-streak",   streak);
}

function setRing(id, frac, circ) {
  const el = document.getElementById(id);
  if (el) el.style.strokeDashoffset = circ - frac * circ;
}

function calcStreak(workouts) {
  const days = new Set(workouts.map(w => w.timestamp.slice(0,10)));
  let streak = 0;
  const d = new Date();
  while (streak < 30) {
    const key = d.toISOString().slice(0,10);
    if (!days.has(key)) break;
    streak++;
    d.setDate(d.getDate()-1);
  }
  return streak;
}

function renderWeekChart(workouts) {
  const container = document.getElementById("week-bar-chart");
  if (!container) return;

  const days  = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const today = new Date().getDay();
  const bars  = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate()-i);
    const key  = d.toISOString().slice(0,10);
    const mins = workouts.filter(w => w.timestamp.startsWith(key))
                         .reduce((s,w) => s + Math.round(w.duration/60), 0);
    bars.push({ label: days[d.getDay()], mins, isToday: i === 0 });
  }

  const maxMins = Math.max(...bars.map(b => b.mins), 30);
  const maxH    = 80;

  container.innerHTML = `
    <div class="bar-chart">
      ${bars.map(b => {
        const h   = b.mins > 0 ? Math.max(4, Math.round((b.mins/maxMins)*maxH)) : 4;
        const cls = b.isToday ? "bar today" : (b.mins > 0 ? "bar active" : "bar empty");
        return `
          <div class="bar-col">
            <span class="bar-val">${b.mins > 0 ? b.mins+"m" : ""}</span>
            <div class="${cls}" style="height:${h}px"></div>
            <span class="bar-label">${b.label}</span>
          </div>`;
      }).join("")}
    </div>`;
}

const TYPE_META = {
  Cardio:      { cls:"cardio",   svg:`<path d="M8 2C5.8 2 4 3.8 4 6C4 8.2 5.8 10 8 10" stroke="currentColor" stroke-width="1.5"/><path d="M8 10C10.2 10 12 8.2 12 6" stroke="currentColor" stroke-width="1.5"/>` },
  Strength:    { cls:"strength", svg:`<path d="M2 8H4M12 8H14M4 8C4 6.3 5.8 5 8 5C10.2 5 12 6.3 12 8C12 9.7 10.2 11 8 11C5.8 11 4 9.7 4 8Z" stroke="currentColor" stroke-width="1.5"/>` },
  Flexibility: { cls:"flex",     svg:`<path d="M4 12C4 12 6 6 8 4C10 6 12 12 12 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>` },
  Balance:     { cls:"balance",  svg:`<circle cx="8" cy="4" r="1.5" stroke="currentColor" stroke-width="1.2"/><path d="M8 6L6 10L8 9L10 12M6 10L4 14" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>` },
  General:     { cls:"cardio",   svg:`<circle cx="8" cy="8" r="5" stroke="currentColor" stroke-width="1.5"/>` },
};

function renderWorkoutHistory(workouts) {
  const list = document.getElementById("history-list");
  if (!list) return;
  if (!workouts.length) { list.innerHTML = `<p class="loading-row">No workouts yet. Complete your first workout!</p>`; return; }
  list.innerHTML = workouts.slice(0,10).map(w => {
    const m    = TYPE_META[w.type] || TYPE_META.General;
    const mins = Math.round(w.duration/60);
    const when = fmtDate(new Date(w.timestamp));
    return `
      <div class="history-item">
        <div class="history-icon ${m.cls}"><svg width="16" height="16" viewBox="0 0 16 16" fill="none">${m.svg}</svg></div>
        <div class="history-details"><p class="history-name">${w.name}</p><p class="history-time">${when}</p></div>
        <div class="history-right"><span class="tag small">${w.type}</span><span class="history-dur">${mins} min</span></div>
      </div>`;
  }).join("");
}

function filterHistory(query) {
  const q = query.toLowerCase();
  const filtered = q ? state.allWorkouts.filter(w => w.name.toLowerCase().includes(q) || w.type.toLowerCase().includes(q)) : state.allWorkouts;
  renderWorkoutHistory(filtered);
}

function fmtDate(date) {
  const diff = Math.floor((new Date() - date) / 86400000);
  const t    = date.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
  if (diff === 0) return `Today, ${t}`;
  if (diff === 1) return `Yesterday, ${t}`;
  return date.toLocaleDateString("en-US",{month:"short",day:"numeric"}) + `, ${t}`;
}

/* ===== SEARCH ===== */
let searchTimeout = null;

function handleSearch(query) {
  clearTimeout(searchTimeout);
  document.getElementById("clear-search-btn").style.display = query ? "block" : "none";
  if (!query.trim()) { showSearchDefault(); return; }
  searchTimeout = setTimeout(() => performSearch(query.trim()), 280);
}

function performSearch(query) {
  const q = query.toLowerCase();
  const results = exerciseDatabase.filter(ex =>
    ex.name.toLowerCase().includes(q) ||
    ex.category.toLowerCase().includes(q) ||
    ex.desc.toLowerCase().includes(q) ||
    ex.tags.some(t => t.includes(q))
  );
  document.getElementById("search-content").classList.add("hidden");
  document.getElementById("no-results").classList.add("hidden");
  document.getElementById("search-results").classList.add("hidden");
  if (!results.length) {
    el("no-results-term", query);
    document.getElementById("no-results").classList.remove("hidden");
  } else {
    el("results-term", query);
    document.getElementById("results-list").innerHTML = results.map(exCardHTML).join("");
    document.getElementById("search-results").classList.remove("hidden");
  }
}

function exCardHTML(ex) {
  const cls   = ex.category.toLowerCase().includes("yoga") ? "yoga-img" : ex.category.toLowerCase().includes("cardio") ? "cardio-img" : "strength-img";
  const color = cls === "yoga-img" ? "#10B981" : cls === "cardio-img" ? "#EF4444" : "#3B82F6";
  return `
    <div class="exercise-card" onclick="openExerciseModal('${ex.id}')">
      <div class="ex-card-img ${cls}">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="20" r="12" stroke="${color}" stroke-width="2" fill="none" opacity="0.5"/>
          <circle cx="20" cy="20" r="5" fill="${color}" opacity="0.7"/>
        </svg>
      </div>
      <div class="ex-card-info">
        <p class="ex-category">${ex.category}</p>
        <p class="ex-name">${ex.name}</p>
        <p class="ex-meta">${ex.duration} · ${ex.intensity} · ${ex.level}</p>
        <button class="btn-outline small">View</button>
      </div>
    </div>`;
}

function showSearchDefault() {
  document.getElementById("search-content").classList.remove("hidden");
  document.getElementById("no-results").classList.add("hidden");
  document.getElementById("search-results").classList.add("hidden");
}

function doSearch(term) {
  document.getElementById("exercise-search").value = term;
  document.getElementById("clear-search-btn").style.display = "block";
  performSearch(term);
}

function clearSearch() {
  document.getElementById("exercise-search").value = "";
  document.getElementById("clear-search-btn").style.display = "none";
  showSearchDefault();
}

function clearHistory() {
  document.getElementById("recent-tags").innerHTML = "";
  document.getElementById("recent-section").style.opacity = "0.4";
}

function setSearchTab(btn) {
  document.querySelectorAll(".tab-pills .pill").forEach(p => p.classList.remove("active"));
  btn.classList.add("active");
}

/* ===== EXERCISE DETAIL MODAL ===== */
function openExerciseModal(id) {
  const ex = exerciseDatabase.find(e => e.id === id);
  if (!ex) return;
  state.currentExerciseId = id;
  el("ex-modal-category", ex.category);
  el("ex-modal-name",     ex.name);
  el("ex-modal-duration", ex.duration);
  el("ex-modal-intensity",ex.intensity + " intensity");
  el("ex-modal-level",    ex.level);
  el("ex-modal-desc",     ex.desc);
  const tagsEl = document.getElementById("ex-modal-tags");
  if (tagsEl) tagsEl.innerHTML = ex.tags.map(t => `<span class="tag">${t}</span>`).join(" ");
  document.getElementById("exercise-modal").classList.remove("hidden");
}

function closeExerciseModal(e) {
  if (!e || e.target === document.getElementById("exercise-modal"))
    document.getElementById("exercise-modal").classList.add("hidden");
}

function startFromModal() {
  closeExerciseModal();
  startWorkout();
}

/* ===== NUTRITION ===== */
async function loadNutrition() {
  const today = new Date().toISOString().slice(0,10);
  try {
    const [meals, workouts] = await Promise.all([
      api("GET", `/api/meals?date=${today}`),
      api("GET", "/api/workouts"),
    ]);
    const todayWorkouts = workouts.filter(w => w.timestamp.startsWith(today));
    renderNutrition(meals, todayWorkouts);
  } catch(e) {
    console.warn("Nutrition load:", e.message);
  }
}

function renderNutrition(meals, todayWorkouts = []) {
  const consumed  = meals.reduce((s,m) => s + m.kcal, 0);
  const burned    = todayWorkouts.reduce((s,w) => s + w.kcalBurned, 0);
  const remaining = Math.max(0, KCAL_GOAL - consumed + burned);

  // Update donut chart
  const C = 376.99;
  const consumedOffset = C - Math.min(consumed / KCAL_GOAL, 1) * C;
  const burnedOffset   = C - Math.min(burned / KCAL_GOAL, 1) * C;

  setDonutArc("donut-consumed", consumedOffset);
  setDonutArc("donut-burned",   burnedOffset);

  el("donut-consumed-val", consumed);
  el("legend-consumed",    consumed + " Kcal");
  el("legend-remaining",   remaining.toLocaleString() + " Kcal");
  el("legend-burned",      burned + " Kcal");

  // Logged meals list
  const listEl = document.getElementById("logged-meals-list");
  const countEl = document.getElementById("meal-count-tag");
  if (countEl) countEl.textContent = meals.length + (meals.length === 1 ? " meal" : " meals");

  if (!listEl) return;
  if (!meals.length) { listEl.innerHTML = `<p class="loading-row">No meals logged yet. Add your first meal!</p>`; return; }

  const TYPE_COLOR = { breakfast:"#F59E0B", lunch:"#3B82F6", dinner:"#10B981", snack:"#A78BFA" };
  listEl.innerHTML = meals.map(m => `
    <div class="logged-meal-item">
      <span class="meal-type-dot" style="background:${TYPE_COLOR[m.type]||"#6B7280"}"></span>
      <div class="logged-meal-info">
        <p class="logged-meal-name">${m.name}</p>
        <p class="logged-meal-meta">${capitalize(m.type)} · ${m.kcal} kcal · ${fmtDate(new Date(m.timestamp))}</p>
      </div>
      <button class="delete-meal-btn" onclick="deleteMeal(${m.id})" title="Remove">✕</button>
    </div>`).join("");
}

function setDonutArc(id, offset) {
  const el = document.getElementById(id);
  if (el) el.style.strokeDashoffset = offset;
}

function openMealModal() {
  document.getElementById("meal-name").value = "";
  document.getElementById("meal-kcal").value = "";
  document.getElementById("meal-modal").classList.remove("hidden");
}

function closeMealModal(e) {
  if (!e || e.target === document.getElementById("meal-modal"))
    document.getElementById("meal-modal").classList.add("hidden");
}

async function logMeal() {
  const name = document.getElementById("meal-name").value.trim();
  const kcal = Number(document.getElementById("meal-kcal").value);
  const type = document.getElementById("meal-type").value;
  if (!name || !kcal) { showToast("Please enter meal name and calories"); return; }
  const btn = document.getElementById("meal-save-btn");
  btn.textContent = "Saving…"; btn.disabled = true;
  try {
    await api("POST", "/api/meals", { name, kcal, type });
    closeMealModal();
    showToast(`${capitalize(type)} logged: ${name} (${kcal} kcal)`);
    loadNutrition();
  } catch(e) {
    showToast("Could not save meal: " + e.message);
  } finally {
    btn.textContent = "Save Meal"; btn.disabled = false;
  }
}

async function quickAddMeal(name, type, kcal) {
  try {
    await api("POST", "/api/meals", { name, kcal, type });
    showToast(`${capitalize(type)} logged: ${name} (${kcal} kcal)`);
    if (document.getElementById("tab-nutrition").style.display !== "none") loadNutrition();
  } catch(e) {
    showToast("Could not log: " + e.message);
  }
}

async function deleteMeal(id) {
  try {
    await api("DELETE", `/api/meals/${id}`);
    loadNutrition();
  } catch(e) {
    showToast("Could not remove meal");
  }
}

/* ===== PROFILE ===== */
async function loadProfile() {
  try {
    const p = await api("GET", "/api/profile");

    el("profile-name-display",  p.name  || "—");
    el("profile-avatar-letter", (p.name||"U")[0].toUpperCase());
    el("profile-age",    p.age    ? p.age            : "—");
    el("profile-weight", p.weight ? p.weight + " lb" : "—");
    el("profile-height", p.height ? p.height + " ft" : "—");

    const condEl = document.getElementById("profile-conditions");
    if (condEl) condEl.innerHTML = p.condition
      ? `<span class="condition-tag">${capitalize(p.condition)}</span><button class="condition-add">+ Add</button>`
      : `<span class="text-muted" style="font-size:13px;color:var(--text-3)">None added</span><button class="condition-add">+ Add</button>`;

    const goalsEl = document.getElementById("profile-goals");
    if (goalsEl) goalsEl.innerHTML = (p.goals||[]).length
      ? p.goals.map(g => `<span class="condition-tag blue-tag">${g}</span>`).join("")
      : `<span style="font-size:13px;color:var(--text-3)">No goals set</span>`;

    // Pre-fill edit form
    setVal("edit-name",       p.name       || "");
    setVal("edit-age",        p.age        || "");
    setVal("edit-sex",        p.sex        || "");
    setVal("edit-weight",     p.weight     || "");
    setVal("edit-height",     p.height     || "");
    setVal("edit-condition",  p.condition  || "");
    setVal("edit-medication", p.medication || "");
  } catch(e) {
    console.warn("Profile load:", e.message);
  }
}

function toggleProfileEdit() {
  const view = document.getElementById("profile-view-mode");
  const edit = document.getElementById("profile-edit-mode");
  const btn  = document.getElementById("profile-edit-btn");
  const isEditing = !edit.classList.contains("hidden");
  view.classList.toggle("hidden",  !isEditing);
  edit.classList.toggle("hidden",   isEditing);
  btn.textContent = isEditing ? "Edit Profile" : "Cancel";
}

function cancelProfileEdit() {
  document.getElementById("profile-view-mode").classList.remove("hidden");
  document.getElementById("profile-edit-mode").classList.add("hidden");
  document.getElementById("profile-edit-btn").textContent = "Edit Profile";
}

async function saveProfile() {
  const payload = {
    name:      document.getElementById("edit-name").value.trim(),
    age:       Number(document.getElementById("edit-age").value)    || null,
    sex:       document.getElementById("edit-sex").value            || null,
    weight:    Number(document.getElementById("edit-weight").value) || null,
    height:    Number(document.getElementById("edit-height").value) || null,
    condition: document.getElementById("edit-condition").value      || null,
    medication:document.getElementById("edit-medication").value.trim() || null,
  };
  try {
    await api("PUT", "/api/profile", payload);
    cancelProfileEdit();
    await loadProfile();
    el("user-name-display", payload.name || "—");
    showToast("Profile updated");
  } catch(e) {
    showToast("Could not save: " + e.message);
  }
}

/* ===== WORKOUT ===== */
function startWorkout() {
  document.querySelectorAll(".tab-content").forEach(t => { t.classList.remove("active"); t.style.display = "none"; });
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  const tab = document.getElementById("tab-workout");
  tab.classList.add("active"); tab.style.display = "block";

  state.currentExerciseIndex = 0;
  state.totalElapsed = 0;
  state.workoutRunning = false;
  state.exerciseTimeLeft = exercises[0].duration;
  state.exerciseDuration  = exercises[0].duration;
  updateExerciseDisplay();
  updateTimerDisplay();
  el("kcal-burned", "0");
  startHeartRateSimulation();
}

async function endWorkout() {
  stopWorkoutTimer();
  stopHeartRateSimulation();
  if (state.totalElapsed > 30) {
    const kcal = Math.floor(state.totalElapsed * 0.12);
    try {
      await api("POST", "/api/workouts", { name:state.workoutName, duration:state.totalElapsed, kcalBurned:kcal, type:"Cardio", intensity:"moderate" });
      showToast(`Workout saved! ${Math.round(state.totalElapsed/60)} min · ${kcal} kcal`);
    } catch(e) {
      showToast("Could not save workout: " + e.message);
    }
  }
  switchTab("progress");
  document.getElementById("nav-progress").classList.add("active");
}

function toggleWorkoutTimer() { state.workoutRunning ? pauseWorkoutTimer() : resumeWorkoutTimer(); }

function resumeWorkoutTimer() {
  state.workoutRunning = true;
  const icon = document.getElementById("play-icon");
  if (icon) icon.innerHTML = `<rect x="6" y="5" width="4" height="14" rx="1" fill="white"/><rect x="14" y="5" width="4" height="14" rx="1" fill="white"/>`;
  state.workoutInterval = setInterval(() => {
    state.exerciseTimeLeft--;
    state.totalElapsed++;
    updateTimerDisplay();
    el("kcal-burned", Math.floor(state.totalElapsed * 0.12));
    updateTimerProgress();
    if (state.exerciseTimeLeft <= 0) {
      if (state.currentExerciseIndex < exercises.length - 1) {
        state.currentExerciseIndex++;
        const ex = exercises[state.currentExerciseIndex];
        state.exerciseTimeLeft = ex.duration;
        state.exerciseDuration  = ex.duration;
        updateExerciseDisplay();
      } else {
        stopWorkoutTimer();
        endWorkout();
      }
    }
  }, 1000);
}

function pauseWorkoutTimer() {
  state.workoutRunning = false;
  clearInterval(state.workoutInterval);
  const icon = document.getElementById("play-icon");
  if (icon) icon.innerHTML = `<path d="M8 6L18 12L8 18V6Z" fill="white"/>`;
}

function stopWorkoutTimer() {
  state.workoutRunning = false;
  clearInterval(state.workoutInterval);
  const icon = document.getElementById("play-icon");
  if (icon) icon.innerHTML = `<path d="M8 6L18 12L8 18V6Z" fill="white"/>`;
}

function nextExercise() {
  if (state.currentExerciseIndex >= exercises.length - 1) return;
  state.currentExerciseIndex++;
  resetCurrentExercise();
}
function prevExercise() {
  if (state.currentExerciseIndex <= 0) return;
  state.currentExerciseIndex--;
  resetCurrentExercise();
}
function resetCurrentExercise() {
  const ex = exercises[state.currentExerciseIndex];
  state.exerciseTimeLeft = ex.duration;
  state.exerciseDuration  = ex.duration;
  updateExerciseDisplay(); updateTimerDisplay(); updateTimerProgress();
  if (state.workoutRunning) { stopWorkoutTimer(); resumeWorkoutTimer(); }
}

function updateExerciseDisplay() {
  const i = state.currentExerciseIndex;
  el("current-step",        exercises[i].step);
  el("current-exercise",    exercises[i].name);
  el("current-instruction", exercises[i].instruction);
  el("timer-exercise",      exercises[i].name);
  el("prev-exercise",       exercises[i-1]?.name || "—");
  el("next-step",           exercises[i+1]?.step || "");
  el("next-exercise",       exercises[i+1]?.name || "Workout complete");
}

function updateTimerDisplay() {
  const m = Math.floor(state.exerciseTimeLeft/60), s = state.exerciseTimeLeft%60;
  el("timer-display", `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`);
  const tm = Math.floor(state.totalElapsed/60), ts = state.totalElapsed%60;
  el("total-time", `${tm}:${String(ts).padStart(2,"0")}`);
}

function updateTimerProgress() {
  const ring = document.getElementById("timer-progress");
  if (ring) ring.style.strokeDashoffset = 553 - (1-(state.exerciseTimeLeft/state.exerciseDuration))*553;
}

function startHeartRateSimulation() {
  let base = 72;
  state.hrInterval = setInterval(() => {
    base = state.workoutRunning
      ? Math.min(165, Math.max(95,  base + Math.floor(Math.random()*6)-2))
      : Math.max(60,  Math.min(90, base + Math.floor(Math.random()*4)-2));
    el("hr-value",     base + 50 + Math.floor(Math.random()*8));
    el("hr-diastolic", base - 30 + Math.floor(Math.random()*6));
  }, 2000);
}
function stopHeartRateSimulation() { clearInterval(state.hrInterval); }

/* ===== FILTER ===== */
function showFilter() { document.getElementById("filter-modal").classList.remove("hidden"); }
function closeFilter(e) { if (e.target === document.getElementById("filter-modal")) closeFilterPanel(); }
function closeFilterPanel() { document.getElementById("filter-modal").classList.add("hidden"); }
function toggleFilter(btn) { btn.classList.toggle("selected"); }
function resetFilters() { document.querySelectorAll(".filter-chip").forEach(c => c.classList.remove("selected")); }
function applyFilters() {
  const sel = [...document.querySelectorAll(".filter-chip.selected")].map(c => c.textContent.trim());
  closeFilterPanel();
  if (sel.length) { doSearch(sel[0]); document.getElementById("exercise-search").value = sel[0]; document.getElementById("clear-search-btn").style.display = "block"; }
}

/* ===== HELPERS ===== */
function el(id, text) { const e = document.getElementById(id); if (e) e.textContent = text; }
function setVal(id, val) { const e = document.getElementById(id); if (e) e.value = val; }
function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ""; }

let toastTimer;
function showToast(msg) {
  let t = document.getElementById("toast");
  if (!t) {
    t = document.createElement("div"); t.id = "toast";
    Object.assign(t.style, {
      position:"fixed", bottom:"32px", left:"50%", transform:"translateX(-50%)",
      background:"#1E1E28", border:"1px solid #2A2A38", color:"#F8F8FF",
      padding:"12px 24px", borderRadius:"10px", fontSize:"14px", fontWeight:"500",
      zIndex:"9999", boxShadow:"0 8px 32px rgba(0,0,0,0.5)", opacity:"0",
      transition:"opacity 300ms ease, transform 300ms ease",
      fontFamily:"'Inter',system-ui,sans-serif", whiteSpace:"nowrap",
    });
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = "1"; t.style.transform = "translateX(-50%) translateY(0)";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.style.opacity="0"; t.style.transform="translateX(-50%) translateY(8px)"; }, 2800);
}

/* ===== INIT ===== */
document.addEventListener("DOMContentLoaded", () => {
  // Init sliders
  ["pain","fatigue"].forEach(type => {
    const s = document.getElementById(`${type}-slider`);
    if (s) { const pct=(s.value/10)*100; s.style.background=`linear-gradient(to right,var(--accent) ${pct}%,var(--surface-3) ${pct}%)`; }
  });

  // Symptom None logic
  const noneBox = document.getElementById("symptom-none");
  if (noneBox) {
    noneBox.addEventListener("change", () => {
      if (noneBox.checked) document.querySelectorAll(".symptom-check input").forEach(cb => { if (cb!==noneBox) cb.checked=false; });
    });
    document.querySelectorAll(".symptom-check input").forEach(cb => {
      if (cb!==noneBox) cb.addEventListener("change", () => { if (cb.checked) noneBox.checked=false; });
    });
  }

  // Check for existing session → go straight to app
  const token = localStorage.getItem("thrive_token");
  if (token) {
    api("GET", "/api/auth/me")
      .then(() => enterApp())
      .catch(() => {
        localStorage.removeItem("thrive_token");
        showScreen("screen-welcome");
      });
  }
});
