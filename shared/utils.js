// Today's date as "YYYY-MM-DD" in the user's LOCAL time
function dateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Number of days between two "YYYY-MM-DD" strings
function daysBetween(earlier, later) {
  const [ey, em, ed] = earlier.split("-").map(Number);
  const [ly, lm, ld] = later.split("-").map(Number);
  const start = new Date(ey, em - 1, ed);
  const end = new Date(ly, lm - 1, ld);
  return Math.round((end - start) / 86400000); // 86,400,000 ms in a day
}

// The streak: full days since the last "bad day"
async function calculateStreak() {
  const { streakStart, sessions = [] } = await chrome.storage.local.get([
    "streakStart",
    "sessions",
  ]);

  // Start with the install date / last manual reset...
  let lastBadDay = streakStart || dateString();

  // ...then push it forward if there was a later "struggling" outcome
  for (const session of sessions) {
    if (session.outcome === "struggling") {
      const day = dateString(new Date(session.timestamp));
      if (day > lastBadDay) lastBadDay = day;
    }
  }

  return daysBetween(lastBadDay, dateString());
}

// Manual reset: the streak starts again from today
async function resetStreak() {
    await chrome.storage.local.set({ streakStart: dateString() });
}
// Format an hour (0-23) like "11 PM"
function formatHour(h) {
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12} ${suffix}`;
}

// Given {name: count}, return the name with the highest count (or null)
function topKey(counts) {
  let best = null;
  let bestCount = 0;
  for (const [name, count] of Object.entries(counts)) {
    if (count > bestCount) {
      best = name;
      bestCount = count;
    }
  }
  return best;
}

// Calculate every number the dashboard and popup display
async function getStats() {
  const { attempts = [], sessions = [] } = await chrome.storage.local.get([
    "attempts",
    "sessions",
  ]);
  const streak = await calculateStreak();

  // Headline numbers
  const interrupted = sessions.filter((s) => s.outcome === "good").length;
  const successRate =
    attempts.length > 0
      ? Math.min(100, Math.round((interrupted / attempts.length) * 100))
      : 0;

  // Trigger counts, e.g. { Boredom: 5, Stress: 3 }
  const triggerCounts = {};
  for (const s of sessions) {
    triggerCounts[s.trigger] = (triggerCounts[s.trigger] || 0) + 1;
  }

  // Riskiest 2-hour window, based on when attempts happen
  let riskyTime = null;
  if (attempts.length > 0) {
    const hourCounts = new Array(24).fill(0);
    for (const a of attempts) {
      hourCounts[new Date(a.timestamp).getHours()]++;
    }
    let bestStart = 0;
    let bestSum = -1;
    for (let h = 0; h < 24; h++) {
      const sum = hourCounts[h] + hourCounts[(h + 1) % 24]; // wraps past midnight
      if (sum > bestSum) {
        bestSum = sum;
        bestStart = h;
      }
    }
    riskyTime = `${formatHour(bestStart)}–${formatHour((bestStart + 2) % 24)}`;
  }

  // Average starting urge
  const avgUrge =
    sessions.length > 0
      ? (sessions.reduce((sum, s) => sum + s.urgeBefore, 0) / sessions.length).toFixed(1)
      : null;

  // Best intervention = activity with the biggest average drop in urge
  const drops = {};
  for (const s of sessions) {
    if (!s.activity) continue;
    drops[s.activity] = drops[s.activity] || { total: 0, count: 0 };
    drops[s.activity].total += s.urgeBefore - s.urgeAfter;
    drops[s.activity].count++;
  }
  let bestActivity = null;
  let bestDrop = -Infinity;
  for (const [name, d] of Object.entries(drops)) {
    const avgDrop = d.total / d.count;
    if (avgDrop > bestDrop) {
      bestDrop = avgDrop;
      bestActivity = name;
    }
  }

  return {
    streak,
    attempts: attempts.length,
    interrupted,
    successRate,
    topTrigger: topKey(triggerCounts),
    triggerCounts,
    riskyTime,
    avgUrge,
    bestActivity,
  };
}
// ---------- Settings ----------
const DEFAULT_SETTINGS = {
  blockAutomatically: true,
  recordAttempts: true,
  strictMode: false,
};

// Read settings, filling in defaults for anything missing
async function getSettings() {
  const { settings = {} } = await chrome.storage.local.get("settings");
  return { ...DEFAULT_SETTINGS, ...settings };
}

async function saveSettings(settings) {
  await chrome.storage.local.set({ settings });
}

// Turn whatever the user typed into a clean domain, or null if invalid
// "https://www.Example.com/page" → "example.com"
function cleanDomain(input) {
  let text = input.trim().toLowerCase();
  if (!text.includes("://")) text = "https://" + text;

  let hostname;
  try {
    hostname = new URL(text).hostname;
  } catch {
    return null;
  }

  hostname = hostname.replace(/^www\./, "");
  if (!hostname.includes(".") || hostname.endsWith(".")) return null;
  return hostname;
}
  "onlyfans.com",
  "fansly.com",
];
