// ---------- The session: everything we collect goes in here ----------
const params = new URLSearchParams(window.location.search);
const site = params.get("site");
document.getElementById("site").textContent = site;

const session = {
  site: site,
  timestamp: Date.now(),
  trigger: null,
  urgeBefore: 5,
  activity: null,
  urgeAfter: 5,
  outcome: null,
};

// ---------- Helpers ----------
// Show one screen, hide the rest
function showScreen(id) {
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.remove("active");
  });
  document.getElementById(id).classList.add("active");
}

// Keep a number display in sync with its slider
function linkSlider(sliderId, outputId) {
  const slider = document.getElementById(sliderId);
  const output = document.getElementById(outputId);
  slider.addEventListener("input", () => {
    output.textContent = slider.value;
  });
}
linkSlider("urge-before", "urge-before-value");
linkSlider("urge-after", "urge-after-value");

// ---------- Screen 1: trigger + urge ----------
const startButton = document.getElementById("start-reset");

document.querySelectorAll('input[name="trigger"]').forEach((radio) => {
  radio.addEventListener("change", () => {
    session.trigger = radio.value;
    startButton.disabled = false; // can't start until a trigger is picked
  });
});

startButton.addEventListener("click", () => {
  session.urgeBefore = Number(document.getElementById("urge-before").value);
  showScreen("screen-step1");
  startCountdown();
});

// ---------- Step 1: 10-second countdown ----------
function startCountdown() {
  let secondsLeft = 10;
  const display = document.getElementById("countdown");
  display.textContent = secondsLeft;

  const timer = setInterval(() => {
    secondsLeft--;
    display.textContent = secondsLeft;
    if (secondsLeft === 0) {
      clearInterval(timer);
      showScreen("screen-step2");
    }
  }, 1000);
}

// ---------- Step 2: leave the room ----------
document.getElementById("step2-done").addEventListener("click", () => {
  showScreen("screen-step3");
});

// ---------- Step 3: choose an activity ----------
document.querySelectorAll("#activities button").forEach((button) => {
  button.addEventListener("click", () => {
    session.activity = button.textContent;
    showScreen("screen-step4");
  });
});

// ---------- Step 4: check in, then finish ----------
document.getElementById("btn-good").addEventListener("click", () => finish("good"));
document.getElementById("btn-struggling").addEventListener("click", () => finish("struggling"));

async function finish(outcome) {
  session.urgeAfter = Number(document.getElementById("urge-after").value);
  session.outcome = outcome;
  await saveSession(session);

  document.getElementById("result-numbers").textContent =
    `Before: ${session.urgeBefore}/10 → After: ${session.urgeAfter}/10`;

  if (outcome === "good") {
    document.getElementById("result-title").textContent = "Urge interrupted.";
    document.getElementById("result-message").textContent =
      "You paused and chose something else. That's the whole game.";
  } else {
    document.getElementById("result-title").textContent = "Thanks for being honest.";
    document.getElementById("result-message").textContent =
      "Urges rise and fall. Stay away from the screen, and consider reaching out to someone you trust.";
  }
  showScreen("screen-result");
}

// ---------- Saving ----------
async function saveSession(newSession) {
  const { sessions = [] } = await chrome.storage.local.get("sessions");
  sessions.push(newSession);
  await chrome.storage.local.set({ sessions });
}
document.getElementById("close-tab").addEventListener("click", async () => {
  const tab = await chrome.tabs.getCurrent();
  chrome.tabs.remove(tab.id);
});