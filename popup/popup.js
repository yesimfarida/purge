async function render() {
  const stats = await getStats();
  document.getElementById("streak").textContent = stats.streak;
  document.getElementById("attempts").textContent = stats.attempts;
  document.getElementById("interrupted").textContent = stats.interrupted;
}

document.getElementById("open-dashboard").addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("dashboard/dashboard.html") });
});

document.getElementById("open-settings").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

render();