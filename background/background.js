importScripts("../shared/utils.js");

// On install/reload: set up any data that doesn't exist yet
chrome.runtime.onInstalled.addListener(async () => {
  const { blockedSites, streakStart, settings } = await chrome.storage.local.get([
    "blockedSites",
    "streakStart",
    "settings",
  ]);
  if (!blockedSites) {
    await chrome.storage.local.set({ blockedSites: STARTER_SITES });
  }
  if (!streakStart) {
    await chrome.storage.local.set({ streakStart: dateString() });
  }
  if (!settings) {
    await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
  }
});

function isBlocked(hostname, blockedSites) {
  return blockedSites.some(
    (site) => hostname === site || hostname.endsWith("." + site)
  );
}

async function logAttempt(site) {
  const { attempts = [] } = await chrome.storage.local.get("attempts");
  attempts.push({ site: site, timestamp: Date.now() });
  await chrome.storage.local.set({ attempts });
}

chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0) return;

  const url = new URL(details.url);
  if (!url.protocol.startsWith("http")) return;

  // NEW: respect the "Block automatically" switch
  const settings = await getSettings();
  if (!settings.blockAutomatically) return;

  const { blockedSites = [] } = await chrome.storage.local.get("blockedSites");

  if (isBlocked(url.hostname, blockedSites)) {
    const blockedPage =
      chrome.runtime.getURL("blocked/blocked.html") +
      "?site=" + encodeURIComponent(url.hostname);
    chrome.tabs.update(details.tabId, { url: blockedPage });

    // NEW: respect the "Record blocked attempts" switch
    if (settings.recordAttempts) {
      logAttempt(url.hostname);
    }
  }
});