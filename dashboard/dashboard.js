function setText(id, value) {
  document.getElementById(id).textContent = value ?? "—";
}

async function render() {
  const stats = await getStats();

  setText("streak", stats.streak);
  setText("attempts", stats.attempts);
  setText("interrupted", stats.interrupted);
  setText("success-rate", stats.successRate + "%");

  setText("top-trigger", stats.topTrigger);
  setText("risky-time", stats.riskyTime);
  setText("avg-urge", stats.avgUrge ? stats.avgUrge + " / 10" : null);
  setText("best-activity", stats.bestActivity);

  // Trigger bars
  const container = document.getElementById("trigger-bars");
  container.textContent = ""; // clear old bars before redrawing

  const entries = Object.entries(stats.triggerCounts).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    container.textContent = "No data yet. Complete a reset to see your patterns.";
    return;
  }

  const max = entries[0][1];
  for (const [name, count] of entries) {
    const row = document.createElement("div");
    row.className = "bar-row";

    const label = document.createElement("span");
    label.textContent = name;

    const track = document.createElement("div");
    track.className = "bar-track";
    const fill = document.createElement("div");
    fill.className = "bar-fill";
    fill.style.width = `${(count / max) * 100}%`;
    track.appendChild(fill);

    const number = document.createElement("span");
    number.textContent = count;

    row.append(label, track, number);
    container.appendChild(row);
  }
}

// Manual streak reset (option 3 from earlier)
document.getElementById("reset-streak").addEventListener("click", async () => {
  if (confirm("Reset your streak to 0? Do this if you slipped outside of Purge.")) {
    await resetStreak();
    render();
  }
});

render();