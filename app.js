const SUPABASE_URL = "https://vbieyynajvvyhrnzduyi.supabase.co/rest/v1/";
const SUPABASE_KEY = "sb_publishable_N3f0OnnJukeZakyvcdgD3g_DzBmh355";
const MAX_TRAININGS = 20;

let data = loadData();
let selectedTrainingId = null;

// Migration from the first version: untouched entries were stored as
// attendance=0 + neutral. They now mean "standardmäßig anwesend".
if (!localStorage.getItem("sportverein_tracker_v2_migrated")) {
  data.trainings.forEach(training => {
    Object.values(training.entries || {}).forEach(entry => {
      if (entry && entry.attendance === 0 && (!entry.performance || entry.performance === "neutral")) {
        entry.attendance = 1;
      }
    });
  });
  localStorage.setItem("sportverein_tracker_v2_migrated", "1");
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

async function loadData() {
  const { data: result, error } = await supabase
    .from("app_data")
    .select("data")
    .eq("id", "main")
    .single();

  if (error) {
    console.error(error);
    showToast("Daten konnten nicht geladen werden.");
    return {
      players: [],
      trainings: []
    };
  }

  return result.data;
}

async function saveData() {
  const { error } = await supabase
    .from("app_data")
    .update({
      data: data,
      updated_at: new Date().toISOString()
    })
    .eq("id", "main");

  if (error) {
    console.error(error);
    showToast("Speichern fehlgeschlagen.");
    return;
  }

  renderAll();
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function todayISO() {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso + "T00:00:00").toLocaleDateString("de-DE");
}

function showToast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 1800);
}

function addTraining() {
  const date = document.getElementById("trainingDate").value;
  if (!date) return showToast("Bitte ein Datum auswählen.");

  if (data.trainings.some(t => t.date === date)) {
    return showToast("Für dieses Datum gibt es bereits ein Training.");
  }

  const training = {
    id: uid(),
    date,
    entries: {}
  };

  data.trainings.push(training);
  data.trainings.sort((a, b) => a.date.localeCompare(b.date));
  selectedTrainingId = training.id;

  // Nur die 20 neuesten behalten.
  if (data.trainings.length > MAX_TRAININGS) {
    data.trainings.sort((a, b) => a.date.localeCompare(b.date));
    data.trainings = data.trainings.slice(-MAX_TRAININGS);
  }

  saveData();
  showToast("Training hinzugefügt.");
}

function deleteTraining(id) {
  const training = data.trainings.find(t => t.id === id);
  if (!training) return;

  const bestaetigt = confirm(
    `Training vom ${formatDate(training.date)} wirklich löschen?`
  );

  if (!bestaetigt) return;

  data.trainings = data.trainings.filter(t => t.id !== id);

  if (selectedTrainingId === id) {
    selectedTrainingId = null;
  }

  saveData();
  showToast("Training wurde gelöscht.");
}

function addPlayer() {
  const input = document.getElementById("playerName");
  const name = input.value.trim();
  if (!name) return showToast("Bitte einen Namen eingeben.");
  if (data.players.length >= 25) return showToast("Maximal 20 Spieler.");
  if (data.players.some(p => p.name.toLowerCase() === name.toLowerCase())) {
    return showToast("Dieser Spieler existiert bereits.");
  }

  data.players.push({ id: uid(), name });
  input.value = "";
  saveData();
  showToast("Spieler hinzugefügt.");
}

function deletePlayer(id) {
  const player = data.players.find(p => p.id === id);
  if (!player) return;
  if (!confirm(`"${player.name}" wirklich löschen?`)) return;

  data.players = data.players.filter(p => p.id !== id);
  data.trainings.forEach(t => delete t.entries[id]);
  saveData();
}

function setEntry(playerId, key, value) { 
  const training = data.trainings.find(t => t.id === selectedTrainingId); 
  if (!training) return; 
  
  if (!training.entries[playerId]) { 
    training.entries[playerId] = { 
      attendance: 1, 
      performance: "neutral", 
      late: false, 
      cancellation: "none" 
    }; 
  } 
  
  const entry = training.entries[playerId]; 
  
  if (key === "attendance") { 
    entry.attendance = value; 
    entry.cancellation = "none"; 
    
    if (value === 0) { 
      entry.late = false; 
    } 
  } else if (key === "cancellation") { 
    entry.cancellation = value; 
    entry.late = false; 
    
    // Bei kurzfristiger Absage oder Abwesenheit 
    // gilt der Spieler nicht als anwesend. 
    entry.attendance = 0; 
  
  } else if (key === "performance") { 
    entry.performance = value; 
    entry.attendance = 1; 
    entry.cancellation = "none"; 
  
  } else if (key === "late") { 
    entry.late = value; 
    ntry.attendance = 1; 
    entry.cancellation = "none"; 
  } 
  
  saveData(); 
}

function getEntry(training, playerId) { 
  const entry = training?.entries?.[playerId]; 
  
  if (!entry) { 
    return { 
      attendance: 1, 
      performance: "neutral", 
      late: false, 
      cancellation: "none" 
    }; 
  } 
  
  return { 
    attendance: entry.attendance ?? 1, 
    performance: entry.performance || "neutral", 
    late: entry.late === true, 
    cancellation: entry.cancellation || "none" 
  }; 
}


function factor(entry) { 
  if (!entry) return 0; 
  
  // Kurzfristig abgesagt = -0,2 Punkte 
  if (entry.cancellation === "short") { 
    return -0.2; 
  } 
  
  // Normal abwesend = 0 Punkte 
  if (entry.attendance !== 1) { 
    return 0; 
  } 
  
  let value = 1.0; 
  
  if (entry.performance === "good") { 
    value = 1.2; 
  } 
  
  if (entry.performance === "bad") { 
    value = 0.8; 
  } 
  
  if (entry.late === true) { 
    value -= 0.1; 
  } 
  
  return Math.max(0, value); 
}

function calculatePlayer(playerId) {
  const trainings = [...data.trainings]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, MAX_TRAININGS);

  let sum = 0;
  let present = 0;
  let factorSum = 0;

  trainings.forEach(t => {
    const e = getEntry(t, playerId);
    sum += factor(e);
    if (e.attendance === 1) {
      present++;
      factorSum += factor(e);
    }
  });

  // Die absolute Summe ist bewusst die zentrale Spieltagszahl:
  // 20 Trainings x 1.0 = 20 Punkte bei neutraler Anwesenheit.
  // Gute/schlechte Leistung verändert den jeweiligen Trainingstag um +/-20%.
  // Zusätzlich zeigen wir eine auf 100 normierte Zahl für die Rangliste.
  const maxPossible = trainings.length * 1.2;
  const score100 = maxPossible ? (sum / maxPossible) * 100 : 0;
  const attendanceRate = trainings.length ? (present / trainings.length) * 100 : 0;
  const avgFactor = present ? factorSum / present : 0;

  return { sum, score100, attendanceRate, avgFactor, present, total: trainings.length };
}

function renderPlayers() {
  const list = document.getElementById("playerList");
  document.getElementById("playerCount").textContent = `${data.players.length}/25`;

  if (!data.players.length) {
    list.innerHTML = `<div class="empty">Noch keine Spieler angelegt.</div>`;
    return;
  }

  list.innerHTML = [...data.players]
    .sort((a, b) => a.name.localeCompare(b.name, "de", { sensitivity: "base" }))
    .map(p => `
    <div class="player-row">
      <span>${escapeHtml(p.name)}</span>
      <button class="delete-btn" onclick="deletePlayer('${p.id}')">Löschen</button>
    </div>
  `).join("");
}

function renderTrainingSelect() {
  const select = document.getElementById("trainingSelect");
  const trainings = [...data.trainings].sort((a, b) => b.date.localeCompare(a.date));

  if (!trainings.length) {
    select.innerHTML = `<option value="">Kein Training vorhanden</option>`;
    selectedTrainingId = null;
    document.getElementById("selectedTrainingLabel").textContent = "Lege zuerst ein Training an.";
    return;
  }

  if (!selectedTrainingId || !trainings.some(t => t.id === selectedTrainingId)) {
    selectedTrainingId = trainings[0].id;
  }

  select.innerHTML = trainings.map(t =>
    `<option value="${t.id}" ${t.id === selectedTrainingId ? "selected" : ""}>${formatDate(t.date)}</option>`
  ).join("");

  const oldDeleteButton = document.getElementById("deleteTrainingBtn");

if (oldDeleteButton) {
  oldDeleteButton.remove();
}

const deleteButton = document.createElement("button");

deleteButton.id = "deleteTrainingBtn";
deleteButton.textContent = "Training löschen";
deleteButton.className = "delete-training-btn";

deleteButton.onclick = () => {
  deleteTraining(selectedTrainingId);
};

select.parentElement.appendChild(deleteButton);

  const t = trainings.find(x => x.id === selectedTrainingId);
  document.getElementById("selectedTrainingLabel").textContent =
    t ? `Ausgewählt: ${formatDate(t.date)}` : "";
}

function renderAttendance() {
  const grid = document.getElementById("attendanceGrid");
  const training = data.trainings.find(t => t.id === selectedTrainingId);

  if (!training) {
    grid.innerHTML = `<div class="empty">Kein Training ausgewählt.</div>`;
    return;
  }

  if (!data.players.length) {
    grid.innerHTML = `<div class="empty">Lege zuerst Spieler an.</div>`;
    return;
  }

  grid.innerHTML = [...data.players]
  .sort((a, b) => a.name.localeCompare(b.name, "de", { sensitivity: "base" }))
  .map(p => {
    const e = getEntry(training, p.id);

    return `
      <div class="attendance-row ${e.attendance === 0 ? "absent" : ""}">

        <div class="player-name">
          <b>${escapeHtml(p.name)}</b>
        </div>

        <button
          class="${e.performance === "good" ? "active good" : ""}"
          onclick="setEntry('${p.id}', 'performance', 'good')">
          🟢 Gut +20%
        </button>

        <button
          class="${e.performance === "bad" ? "active bad" : ""}"
          onclick="setEntry('${p.id}', 'performance', 'bad')">
          🔴 Schlecht -20%
        </button>

        <button
          class="${e.performance === "neutral" ? "active neutral" : ""}"
          onclick="setEntry('${p.id}', 'performance', 'neutral')">
          ➖ Neutral
        </button>

        <button
          class="late-btn ${e.late === true ? "active late" : ""}"
          onclick="setEntry('${p.id}', 'late', ${!e.late})">
          ⏰ Zu spät −10%
        </button>

        <button
          class="absent-btn ${e.attendance === 0 && e.cancellation !== "short" ? "active absent" : ""}"
          onclick="setEntry('${p.id}', 'attendance', 0)">
          ❌ Abwesend
        </button>

        <button
          class="short-cancel-btn ${e.cancellation === "short" ? "active short-cancel" : ""}"
          onclick="setEntry('${p.id}', 'cancellation', 'short')">
          ⚠️ Kurzfristig abgesagt
        </button>

      </div>
    `;
  }).join("");
}

function renderRanking() {
  const body = document.getElementById("rankingBody");
  const rows = data.players.map(p => ({
    ...p,
    ...calculatePlayer(p.id)
  })).sort((a, b) => b.sum - a.sum || b.attendanceRate - a.attendanceRate);

  if (!rows.length) {
    body.innerHTML = `<tr><td colspan="6" class="empty">Noch keine Spieler vorhanden.</td></tr>`;
    return;
  }

  body.innerHTML = rows.map((p, i) => `
    <tr>
      <td class="rank">${i + 1}</td>
      <td><b>${escapeHtml(p.name)}</b></td>
      <td>${p.present}/${p.total}</td>
      <td>${p.attendanceRate.toFixed(0)}%</td>
      <td>${p.avgFactor ? p.avgFactor.toFixed(2) : "–"}</td>
      <td class="score">${p.sum.toFixed(2)}</td>
    </tr>
  `).join("");
}

function renderAll() {
  renderPlayers();
  renderTrainingSelect();
  renderAttendance();
  renderRanking();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function exportData() {
  const blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sportverein-tracker-${todayISO()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      if (!Array.isArray(imported.players) || !Array.isArray(imported.trainings)) {
        throw new Error();
      }
      if (!confirm("Aktuelle Daten durch die importierten Daten ersetzen?")) return;
      data = imported;
      selectedTrainingId = null;
      saveData();
      showToast("Daten importiert.");
    } catch {
      showToast("Ungültige Datei.");
    }
  };
  reader.readAsText(file);
}

document.getElementById("trainingDate").value = todayISO();
document.getElementById("addTrainingBtn").addEventListener("click", addTraining);
document.getElementById("addPlayerBtn").addEventListener("click", addPlayer);
document.getElementById("playerName").addEventListener("keydown", e => {
  if (e.key === "Enter") addPlayer();
});
document.getElementById("trainingSelect").addEventListener("change", e => {
  selectedTrainingId = e.target.value || null;
  renderAttendance();
  renderTrainingSelect();
});
document.getElementById("exportBtn").addEventListener("click", exportData);
document.getElementById("importInput").addEventListener("change", e => {
  if (e.target.files[0]) importData(e.target.files[0]);
});

document.getElementById("playerToggle").addEventListener("click", () => {
  const content = document.getElementById("playerManagementContent");
  const arrow = document.getElementById("playerArrow");

  content.classList.toggle("open");

  if (content.classList.contains("open")) {
    arrow.textContent = "▲";
  } else {
    arrow.textContent = "▼";
  }
});

async function init() {
  data = await loadData();

  // Migration
  if (!data.players) {
    data.players = [];
  }

  if (!data.trainings) {
    data.trainings = [];
  }

  renderAll();
}

init();
