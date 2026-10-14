const CONFIRM_PHRASE = "I choose to lower my guard";

const siteList = document.getElementById("site-list");
const messageEl = document.getElementById("message");

function showMessage(text) {
  messageEl.textContent = text;
}

// ---------- Strict mode gate ----------
// Returns true if the action is allowed to go ahead
async function confirmWeakening(actionText) {
  const settings = await getSettings();
  if (!settings.strictMode) return true; // no friction when strict mode is off

  const answer = prompt(
    `Strict mode is on.\n\nTo ${actionText}, type this exactly:\n\n${CONFIRM_PHRASE}`
  );
  return answer === CONFIRM_PHRASE;
}

// ---------- Blocked sites ----------
async function renderSites() {
  const { blockedSites = [] } = await chrome.storage.local.get("blockedSites");
  siteList.textContent = "";

  if (blockedSites.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "No sites blocked yet.";
    siteList.appendChild(empty);
    return;
  }

  for (const site of blockedSites) {
    const row = document.createElement("div");
    row.className = "site-row";

    const name = document.createElement("span");
    name.textContent = site;

    const removeButton = document.createElement("button");
    removeButton.className = "remove";
    removeButton.textContent = "Remove";
    removeButton.addEventListener("click", () => removeSite(site));

    row.append(name, removeButton);
    siteList.appendChild(row);
  }
}

async function addSite(input) {
  const domain = cleanDomain(input);
  if (!domain) {
    showMessage("That doesn't look like a valid website. Try something like example.com");
    return;
  }

  const { blockedSites = [] } = await chrome.storage.local.get("blockedSites");
  if (blockedSites.includes(domain)) {
    showMessage(`${domain} is already blocked.`);
    return;
  }

  blockedSites.push(domain);
  await chrome.storage.local.set({ blockedSites });
  showMessage(`Added ${domain}.`);
  renderSites();
}

async function removeSite(site) {
  const allowed = await confirmWeakening(`unblock ${site}`);
  if (!allowed) return;

  const { blockedSites = [] } = await chrome.storage.local.get("blockedSites");
  const updated = blockedSites.filter((s) => s !== site);
  await chrome.storage.local.set({ blockedSites: updated });
  showMessage(`Removed ${site}.`);
  renderSites();
}

document.getElementById("add-form").addEventListener("submit", (event) => {
  event.preventDefault(); // stop the page from reloading
  const input = document.getElementById("site-input");
  addSite(input.value);
  input.value = "";
});

// ---------- Starter list ----------
document.getElementById("add-starter").addEventListener("click", async () => {
  const { blockedSites = [] } = await chrome.storage.local.get("blockedSites");
  const merged = [...new Set([...blockedSites, ...STARTER_SITES])];
  const added = merged.length - blockedSites.length;

  await chrome.storage.local.set({ blockedSites: merged });
  showMessage(added > 0 ? `Added ${added} sites.` : "Starter list already added.");
  renderSites();
});

// ---------- Protection toggles ----------

const toggleKeys = ["blockAutomatically", "recordAttempts", "strictMode"];

async function loadToggles() {
  const settings = await getSettings();
  for (const key of toggleKeys) {
    document.getElementById(key).checked = settings[key];
  }
}

const actionText = {
  blockAutomatically: "turn off automatic blocking",
  strictMode: "turn off strict mode",
};

for (const key of toggleKeys) {
  const checkbox = document.getElementById(key);

  checkbox.addEventListener("change", async () => {
    // Turning OFF these two weakens protection, so they go through the gate
    const weakening = !checkbox.checked && key in actionText;
    if (weakening) {
      const allowed = await confirmWeakening(actionText[key]);
      if (!allowed) {
        checkbox.checked = true; // put the switch back
        return;
      }
    }

    const settings = await getSettings();
    settings[key] = checkbox.checked;
    await saveSettings(settings);
  });
}

// ---------- Delete data ----------
document.getElementById("delete-data").addEventListener("click", async () => {
  const sure = confirm(
    "Delete all your history (attempts, resets and streak)? Your blocked sites and settings will be kept. This can't be undone."
  );
  if (!sure) return;

  await chrome.storage.local.remove(["attempts", "sessions"]);
  await resetStreak();
  showMessage("Your history has been deleted.");
});

// ---------- Start ----------
renderSites();
loadToggles();