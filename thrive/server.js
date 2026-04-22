import http from "http";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR  = path.join(__dirname, "data");

fs.mkdirSync(path.join(DATA_DIR, "users"), { recursive: true });

// ===== DATA HELPERS =====
function readJson(filePath, fallback) {
  try   { return JSON.parse(fs.readFileSync(filePath, "utf8")); }
  catch { return fallback; }
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function nextId(arr) {
  return arr.length > 0 ? Math.max(...arr.map(x => x.id)) + 1 : 1;
}

// Per-user file helpers
function uFile(userId, name) {
  return path.join(DATA_DIR, "users", String(userId), name);
}
function uRead(userId, name, fallback = []) {
  return readJson(uFile(userId, name), fallback);
}
function uWrite(userId, name, data) {
  writeJson(uFile(userId, name), data);
}

// Seed data generators — dates relative to now so stats always look live
function daysAgo(n, hour = 9) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function makeSeedWorkouts() {
  return [
    { id:1, timestamp:daysAgo(0, 8),  name:"Morning Walk",       duration:1200, kcalBurned:144, type:"Cardio",      intensity:"low"      },
    { id:2, timestamp:daysAgo(1, 15), name:"Chair Exercises",    duration:900,  kcalBurned:65,  type:"Strength",    intensity:"low"      },
    { id:3, timestamp:daysAgo(1, 9),  name:"Stretching Routine", duration:600,  kcalBurned:42,  type:"Flexibility", intensity:"low"      },
    { id:4, timestamp:daysAgo(2, 17), name:"Evening Walk",       duration:1500, kcalBurned:180, type:"Cardio",      intensity:"moderate" },
    { id:5, timestamp:daysAgo(2, 10), name:"Balance Exercises",  duration:720,  kcalBurned:58,  type:"Balance",     intensity:"low"      },
    { id:6, timestamp:daysAgo(3, 9),  name:"Cardio & Strength",  duration:1800, kcalBurned:216, type:"Cardio",      intensity:"moderate" },
    { id:7, timestamp:daysAgo(5, 8),  name:"Morning Walk",       duration:1200, kcalBurned:144, type:"Cardio",      intensity:"low"      },
  ];
}

function makeSeedCheckins() {
  return [
    { id:1, timestamp:daysAgo(1, 9),  mood:"okay",  pain:4, fatigue:6, symptoms:["dizziness"], notes:"Slight headache",
      recommendation:{ intensity:"low", workout:"Chair Exercises & Light Walking (20 min)", message:"Based on your moderate fatigue, we have adjusted today's workout to lower intensity." } },
    { id:2, timestamp:daysAgo(2, 8),  mood:"good",  pain:1, fatigue:2, symptoms:[], notes:"",
      recommendation:{ intensity:"moderate", workout:"Cardio & Strength (30 min)", message:"You're feeling great! Your regular Cardio & Strength session is ready." } },
    { id:3, timestamp:daysAgo(3, 7),  mood:"tired", pain:3, fatigue:8, symptoms:["shortness-of-breath"], notes:"Poor sleep",
      recommendation:{ intensity:"very-low", workout:"Gentle Breathing & Stretching (10 min)", message:"Your fatigue is high today. We have replaced your workout with a gentle 10-minute session." } },
  ];
}

function makeSeedMeals() {
  return [
    { id:1, timestamp:daysAgo(0, 7),  name:"Avocado Toast",  kcal:200, type:"breakfast" },
    { id:2, timestamp:daysAgo(0, 12), name:"Chicken Bowl",   kcal:750, type:"lunch"     },
  ];
}

// ===== AUTH =====
function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}
function verifyPassword(password, salt, hash) {
  return crypto.timingSafeEqual(
    Buffer.from(hashPassword(password, salt), "hex"),
    Buffer.from(hash, "hex")
  );
}
function generateSalt()  { return crypto.randomBytes(16).toString("hex"); }
function generateToken() { return crypto.randomBytes(32).toString("hex"); }

function authenticate(req) {
  const header = req.headers["authorization"];
  if (!header || !header.startsWith("Bearer ")) return null;
  const token    = header.slice(7);
  const sessions = readJson(path.join(DATA_DIR, "sessions.json"), []);
  const session  = sessions.find(s => s.token === token && new Date(s.expires) > new Date());
  return session ? session.userId : null;
}

function createSession(userId) {
  const token    = generateToken();
  const expires  = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
  const sessions = readJson(path.join(DATA_DIR, "sessions.json"), []);
  sessions.push({ token, userId, expires });
  writeJson(path.join(DATA_DIR, "sessions.json"), sessions);
  return token;
}

// ===== RECOMMENDATION ENGINE =====
function generateRecommendation({ pain, fatigue, symptoms = [] }) {
  if (symptoms.includes("chest-discomfort") || pain >= 9)
    return { intensity:"rest",     workout:"Rest Day — Contact your doctor",            message:"We detected concerning symptoms. Please rest and contact your healthcare provider." };
  if (fatigue >= 8 || pain >= 7)
    return { intensity:"very-low", workout:"Gentle Breathing & Stretching (10 min)",    message:"Your fatigue or pain is high. We replaced your workout with a gentle 10-minute breathing session." };
  if (fatigue >= 5 || pain >= 4)
    return { intensity:"low",      workout:"Chair Exercises & Light Walking (20 min)",  message:"Based on moderate fatigue, today's workout is lower intensity. Stay hydrated and move gently." };
  if (symptoms.includes("dizziness") || symptoms.includes("swelling"))
    return { intensity:"low",      workout:"Light Stretching & Balance Work (15 min)",  message:"Given today's symptoms, we recommend a lighter session. Avoid sudden movements." };
  return   { intensity:"moderate", workout:"Cardio & Strength (30 min)",                message:"You're feeling good! Your Cardio & Strength session is ready. Warm up thoroughly." };
}

// ===== HTTP HELPERS =====
const MIME = { ".html":"text/html", ".css":"text/css", ".js":"text/javascript" };

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type":"application/json", "Access-Control-Allow-Origin":"*" });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", () => {
      if (!body) return resolve({});
      try { resolve(JSON.parse(body)); } catch { reject(new Error("Invalid JSON")); }
    });
  });
}

function serveStatic(res, filePath) {
  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, content) => {
    if (err) { res.writeHead(404); res.end("Not found"); return; }
    res.writeHead(200, { "Content-Type": MIME[ext] || "text/plain", "Cache-Control": "no-store" });
    res.end(content);
  });
}

// ===== ROUTE HANDLERS =====
const routes = [];
function route(method, pattern, handler) {
  routes.push({ method, pattern, handler });
}

function matchRoute(method, pathname) {
  for (const r of routes) {
    if (r.method !== method && r.method !== "ALL") continue;
    const keys = [];
    const regexStr = r.pattern.replace(/:([^/]+)/g, (_, k) => { keys.push(k); return "([^/]+)"; });
    const match = pathname.match(new RegExp(`^${regexStr}$`));
    if (match) return { handler: r.handler, params: Object.fromEntries(keys.map((k,i) => [k, match[i+1]])) };
  }
  return null;
}

// ── Auth ──────────────────────────────────────────────────────
route("POST", "/api/auth/register", async (req, res) => {
  const { name, email, password } = await readBody(req);
  if (!name || !email || !password)          return sendJson(res, 400, { error:"name, email and password are required" });
  if (password.length < 6)                   return sendJson(res, 400, { error:"Password must be at least 6 characters" });

  const users = readJson(path.join(DATA_DIR, "users.json"), []);
  if (users.find(u => u.email === email))    return sendJson(res, 409, { error:"An account with that email already exists" });

  const salt         = generateSalt();
  const passwordHash = hashPassword(password, salt);
  const user         = { id: nextId(users), email, passwordHash, salt, createdAt: new Date().toISOString() };

  users.push(user);
  writeJson(path.join(DATA_DIR, "users.json"), users);

  // Seed new user's data
  const profile = { name, age:null, sex:null, weight:null, height:null, condition:null, medication:null, goals:[] };
  uWrite(user.id, "profile.json",  profile);
  uWrite(user.id, "checkins.json", makeSeedCheckins());
  uWrite(user.id, "workouts.json", makeSeedWorkouts());
  uWrite(user.id, "meals.json",    makeSeedMeals());

  const token = createSession(user.id);
  console.log(`  → Registered user ${user.id} <${email}>`);
  return sendJson(res, 201, { token, user: { id:user.id, email, name } });
});

route("POST", "/api/auth/login", async (req, res) => {
  const { email, password } = await readBody(req);
  if (!email || !password) return sendJson(res, 400, { error:"email and password are required" });

  const users = readJson(path.join(DATA_DIR, "users.json"), []);
  const user  = users.find(u => u.email === email);
  if (!user) return sendJson(res, 401, { error:"Invalid email or password" });

  let ok = false;
  try { ok = verifyPassword(password, user.salt, user.passwordHash); } catch { ok = false; }
  if (!ok) return sendJson(res, 401, { error:"Invalid email or password" });

  const token   = createSession(user.id);
  const profile = uRead(user.id, "profile.json", {});
  console.log(`  → Login user ${user.id} <${email}>`);
  return sendJson(res, 200, { token, user: { id:user.id, email, name: profile.name || email } });
});

route("POST", "/api/auth/logout", async (req, res) => {
  const header = req.headers["authorization"];
  if (header && header.startsWith("Bearer ")) {
    const token    = header.slice(7);
    const sessions = readJson(path.join(DATA_DIR, "sessions.json"), []);
    writeJson(path.join(DATA_DIR, "sessions.json"), sessions.filter(s => s.token !== token));
  }
  return sendJson(res, 200, { ok:true });
});

route("GET", "/api/auth/me", async (req, res) => {
  const userId = authenticate(req);
  if (!userId) return sendJson(res, 401, { error:"Unauthorized" });
  const users   = readJson(path.join(DATA_DIR, "users.json"), []);
  const user    = users.find(u => u.id === userId);
  const profile = uRead(userId, "profile.json", {});
  return sendJson(res, 200, { id:userId, email:user ? user.email : null, name:profile.name });
});

// ── Profile ───────────────────────────────────────────────────
route("GET", "/api/profile", async (req, res) => {
  const userId = authenticate(req);
  if (!userId) return sendJson(res, 401, { error:"Unauthorized" });
  return sendJson(res, 200, uRead(userId, "profile.json", {}));
});

route("PUT", "/api/profile", async (req, res) => {
  const userId = authenticate(req);
  if (!userId) return sendJson(res, 401, { error:"Unauthorized" });
  const body    = await readBody(req);
  const current = uRead(userId, "profile.json", {});
  const allowed = ["name","age","sex","weight","height","condition","medication","goals"];
  allowed.forEach(k => { if (body[k] !== undefined) current[k] = body[k]; });
  uWrite(userId, "profile.json", current);
  return sendJson(res, 200, current);
});

// ── Check-ins ─────────────────────────────────────────────────
route("GET", "/api/checkins", async (req, res) => {
  const userId = authenticate(req);
  if (!userId) return sendJson(res, 401, { error:"Unauthorized" });
  const all = uRead(userId, "checkins.json").sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
  return sendJson(res, 200, all);
});

route("GET", "/api/checkins/latest", async (req, res) => {
  const userId = authenticate(req);
  if (!userId) return sendJson(res, 401, { error:"Unauthorized" });
  const all = uRead(userId, "checkins.json");
  if (!all.length) return sendJson(res, 404, { error:"No check-ins yet" });
  return sendJson(res, 200, all.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp))[0]);
});

// Primary demo flow: User → Client → Server → Data → Response → UI
route("POST", "/api/checkins", async (req, res) => {
  const userId = authenticate(req);
  if (!userId) return sendJson(res, 401, { error:"Unauthorized" });
  const { mood, pain, fatigue, symptoms, notes } = await readBody(req);
  if (!mood)                               return sendJson(res, 400, { error:"mood is required" });
  if (pain == null || fatigue == null)     return sendJson(res, 400, { error:"pain and fatigue are required" });
  if (pain < 0 || pain > 10 || fatigue < 0 || fatigue > 10)
                                           return sendJson(res, 400, { error:"pain and fatigue must be 0–10" });

  const recommendation = generateRecommendation({ pain:Number(pain), fatigue:Number(fatigue), symptoms });
  const checkin = { id:nextId(uRead(userId,"checkins.json")), timestamp:new Date().toISOString(), mood, pain:Number(pain), fatigue:Number(fatigue), symptoms:symptoms||[], notes:notes||"", recommendation };
  const all = uRead(userId, "checkins.json");
  all.push(checkin);
  uWrite(userId, "checkins.json", all);
  console.log(`  → Check-in saved user=${userId} fatigue=${fatigue} → ${recommendation.intensity}`);
  return sendJson(res, 201, checkin);
});

// ── Workouts ──────────────────────────────────────────────────
route("GET", "/api/workouts", async (req, res) => {
  const userId = authenticate(req);
  if (!userId) return sendJson(res, 401, { error:"Unauthorized" });
  return sendJson(res, 200, uRead(userId,"workouts.json").sort((a,b) => new Date(b.timestamp)-new Date(a.timestamp)));
});

route("POST", "/api/workouts", async (req, res) => {
  const userId = authenticate(req);
  if (!userId) return sendJson(res, 401, { error:"Unauthorized" });
  const { name, duration, kcalBurned, type, intensity } = await readBody(req);
  if (!name || !duration) return sendJson(res, 400, { error:"name and duration are required" });
  const workout = { id:nextId(uRead(userId,"workouts.json")), timestamp:new Date().toISOString(), name, duration:Number(duration), kcalBurned:Number(kcalBurned)||0, type:type||"General", intensity:intensity||"moderate" };
  const all = uRead(userId, "workouts.json");
  all.push(workout);
  uWrite(userId, "workouts.json", all);
  console.log(`  → Workout logged user=${userId} "${name}" ${Math.round(duration/60)} min`);
  return sendJson(res, 201, workout);
});

// ── Meals ─────────────────────────────────────────────────────
route("GET", "/api/meals", async (req, res) => {
  const userId = authenticate(req);
  if (!userId) return sendJson(res, 401, { error:"Unauthorized" });
  const { searchParams } = new URL(req.url, "http://localhost");
  const dateStr = searchParams.get("date");               // YYYY-MM-DD filter
  let all = uRead(userId, "meals.json");
  if (dateStr) all = all.filter(m => m.timestamp.startsWith(dateStr));
  return sendJson(res, 200, all.sort((a,b) => new Date(a.timestamp)-new Date(b.timestamp)));
});

route("POST", "/api/meals", async (req, res) => {
  const userId = authenticate(req);
  if (!userId) return sendJson(res, 401, { error:"Unauthorized" });
  const { name, kcal, type } = await readBody(req);
  if (!name || kcal == null) return sendJson(res, 400, { error:"name and kcal are required" });
  const validTypes = ["breakfast","lunch","dinner","snack"];
  const meal = { id:nextId(uRead(userId,"meals.json")), timestamp:new Date().toISOString(), name, kcal:Number(kcal), type:validTypes.includes(type)?type:"snack" };
  const all = uRead(userId, "meals.json");
  all.push(meal);
  uWrite(userId, "meals.json", all);
  console.log(`  → Meal logged user=${userId} "${name}" ${kcal} kcal`);
  return sendJson(res, 201, meal);
});

route("DELETE", "/api/meals/:id", async (req, res, params) => {
  const userId = authenticate(req);
  if (!userId) return sendJson(res, 401, { error:"Unauthorized" });
  const id  = Number(params.id);
  const all = uRead(userId, "meals.json");
  const idx = all.findIndex(m => m.id === id);
  if (idx === -1) return sendJson(res, 404, { error:"Meal not found" });
  const [deleted] = all.splice(idx, 1);
  uWrite(userId, "meals.json", all);
  return sendJson(res, 200, deleted);
});

// ===== SERVER =====
const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, "http://localhost");
  console.log(`${req.method} ${pathname}`);

  if (req.method === "OPTIONS") {
    res.writeHead(204, { "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Methods":"GET,POST,PUT,DELETE", "Access-Control-Allow-Headers":"Content-Type,Authorization" });
    res.end(); return;
  }

  const match = matchRoute(req.method, pathname);
  if (match) {
    try { await match.handler(req, res, match.params); }
    catch (e) { sendJson(res, 400, { error: e.message }); }
    return;
  }

  // Static files
  const reqPath = pathname === "/" ? "/index.html" : pathname;
  serveStatic(res, path.join(__dirname, "public", reqPath));
});

server.listen(3000, () => {
  console.log("Thrive → http://localhost:3000");
  console.log("POST /api/auth/register  POST /api/auth/login");
  console.log("GET|PUT /api/profile     GET|POST /api/checkins");
  console.log("GET|POST /api/workouts   GET|POST|DELETE /api/meals");
});
