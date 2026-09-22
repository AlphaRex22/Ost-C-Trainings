const SUPABASE_URL = "https://vbieyynajvvyhrnzduyi.supabase.co";
const SUPABASE_KEY = "sb_publishable_N3f0OnnJukeZakyvcdgD3g_DzBmh355";

const MAX_TRAININGS = 20;

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

let data = {
  players: [],
  trainings: []
};

let selectedTrainingId = null;


// =========================
// DATEN LADEN
// =========================

async function loadData() {
  const { data: result, error } = await supabaseClient
    .from("app_data")
    .select("data")
    .eq("id", "main")
    .single();

  if (error) {
    console.error("Supabase Ladefehler:", error);
    showToast("Daten konnten nicht geladen werden.");

    return {
      players: [],
      trainings: []
    };
  }

  return result?.data || {
    players: [],
    trainings: []
  };
}


// =========================
// DATEN SPEICHERN
// =========================

async function saveData() {
  const { error } = await supabaseClient
    .from("app_data")
    .update({
      data: data,
      updated_at: new Date().toISOString()
    })
    .eq("id", "main");

  if (error) {
    console.error("Supabase Speicherfehler:", error);
    showToast("Speichern fehlgeschlagen.");
    return false;
  }

  renderAll();
  return true;
}


// =========================
// HILFSFUNKTIONEN
// =========================

function uid() {
  return Date.now().toString(36) +
    Math.random().toString(36).slice(2, 8);
}

function todayISO() {
  const d = new Date();

  const local = new Date(
    d.getTime() - d.getTimezoneOffset() * 60000
  );

  return local.toISOString().slice(0, 10);
}

function formatDate(iso) {
  if (!iso) return "";

  return new Date(iso + "T00:00:00")
    .toLocaleDateString("de-DE");
}

function showToast(msg) {
  const el = document.getElementById("toast");

  if (!el) return;

  el.textContent = msg;
  el.classList.add("show");

  setTimeout(() => {
    el.classList.remove("show");
  }, 1800);
}


// =========================
// TRAINING
// =========================

async function addTraining() {
  const date =
    document.getElementById("trainingDate").value;

  if (!date) {
    return showToast(
      "Bitte ein Datum auswählen."
    );
  }

  if (
    data.trainings.some(
      t => t.date === date
    )
  ) {
    return showToast(
      "Für dieses Datum gibt es bereits ein Training."
    );
  }

  const training = {
    id: uid(),
    date: date,
    entries: {}
  };

  data.trainings.push(training);

  data.trainings.sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  selectedTrainingId = training.id;

  // Nur die 20 neuesten Trainings behalten
  if (data.trainings.length > MAX_TRAININGS) {

    data.trainings.sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    data.trainings =
      data.trainings.slice(-MAX_TRAININGS);
  }

  const success = await saveData();

  if (success) {
    showToast("Training hinzugefügt.");
  }
}


async function deleteTraining(id) {
  const training =
    data.trainings.find(
      t => t.id === id
    );

  if (!training) return;

  const bestaetigt = confirm(
    `Training vom ${formatDate(training.date)} wirklich löschen?`
  );

  if (!bestaetigt) return;

  data.trainings =
    data.trainings.filter(
      t => t.id !== id
    );

  if (selectedTrainingId === id) {
    selectedTrainingId = null;
  }

  const success = await saveData();

  if (success) {
    showToast("Training wurde gelöscht.");
  }
}


// =========================
// SPIELER
// =========================

async function addPlayer() {
  const input =
    document.getElementById("playerName");

  const name =
    input.value.trim();

  if (!name) {
    return showToast(
      "Bitte einen Namen eingeben."
    );
  }

  if (data.players.length >= 25) {
    return showToast(
      "Maximal 25 Spieler."
    );
  }

  if (
    data.players.some(
      p =>
        p.name.toLowerCase() ===
        name.toLowerCase()
    )
  ) {
    return showToast(
      "Dieser Spieler existiert bereits."
    );
  }

  data.players.push({
    id: uid(),
    name: name
  });

  input.value = "";

  const success =
    await saveData();

  if (success) {
    showToast(
      "Spieler hinzugefügt."
    );
  }
}


async function deletePlayer(id) {
  const player =
    data.players.find(
      p => p.id === id
    );

  if (!player) return;

  if (
    !confirm(
      `"${player.name}" wirklich löschen?`
    )
  ) {
    return;
  }

  data.players =
    data.players.filter(
      p => p.id !== id
    );

  data.trainings.forEach(
    training => {

      if (training.entries) {
        delete training.entries[id];
      }

    }
  );

  const success =
    await saveData();

  if (success) {
    showToast(
      "Spieler gelöscht."
    );
  }
}


// =========================
// TRAININGSEINTRÄGE
// =========================

async function setEntry(
  playerId,
  key,
  value
) {
  const training =
    data.trainings.find(
      t => t.id === selectedTrainingId
    );

  if (!training) return;

  if (!training.entries) {
    training.entries = {};
  }

  if (!training.entries[playerId]) {

    training.entries[playerId] = {
      attendance: 1,
      performance: "neutral",
      late: false,
      cancellation: "none"
    };

  }

  const entry =
    training.entries[playerId];


  // =========================
  // ABWESEND
  // =========================

  if (key === "attendance") {

    entry.attendance = value;

    // Normale Abwesenheit
    // ist keine kurzfristige Absage
    entry.cancellation = "none";

    if (value === 0) {
      entry.late = false;
    }

  }


  // =========================
  // KURZFRISTIG ABGESAGT
  // =========================

  else if (key === "cancellation") {

    if (
      entry.cancellation === "short"
    ) {

      // Kurzfristige Absage wieder entfernen
      entry.cancellation = "none";
      entry.attendance = 1;

    } else {

      // Kurzfristig abgesagt
      entry.cancellation = "short";
      entry.attendance = 0;

      // Keine Leistung und kein Zuspätkommen
      entry.performance = "neutral";
      entry.late = false;
    }

  }


  // =========================
  // LEISTUNG
  // =========================

  else if (key === "performance") {

    entry.performance = value;

    // Wer Leistung bekommt,
    // gilt als anwesend
    entry.attendance = 1;

    // Absage entfernen
    entry.cancellation = "none";
  }


  // =========================
  // ZU SPÄT
  // =========================

  else if (key === "late") {

    entry.late = value;

    // Zuspätkommen nur bei Anwesenheit
    entry.attendance = 1;

    // Absage entfernen
    entry.cancellation = "none";
  }

  await saveData();
}


// =========================
// EINTRAG AUSLESEN
// =========================

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


// =========================
// EINZELNEN FAKTOR BERECHNEN
// =========================

function factor(entry) {

  if (!entry) {
    return 0;
  }

  // Kurzfristig abgesagt
  // = exakt -0,2
  if (
    entry.cancellation === "short"
  ) {
    return -0.2;
  }

  // Normal abwesend
  // = 0 Punkte
  if (
    entry.attendance !== 1
  ) {
    return 0;
  }

  let value = 1.0;


  // Gut
  if (
    entry.performance === "good"
  ) {
    value = 1.2;
  }


  // Schlecht
  if (
    entry.performance === "bad"
  ) {
    value = 0.8;
  }


  // Zu spät
  if (
    entry.late === true
  ) {
    value -= 0.1;
  }


  return value;
}


// =========================
// SPIELER BERECHNEN
// =========================

function calculatePlayer(playerId) {
  let total = 0;
  let presentCount = 0;
  let lateCount = 0;
  let shortCancellationCount = 0;

  data.trainings.forEach(training => {
    const entry = training.entries?.[playerId];

    if (!entry) return;

    // Kurzfristig abgesagt = exakt -0,20
    // Keine weiteren Punkte oder Abzüge für dieses Training
    if (entry.cancellation === "short") {
      total -= 0.2;
      shortCancellationCount++;
      return;
    }

    // Normal abwesend = 0 Punkte
    if (entry.attendance !== 1) {
      return;
    }

    presentCount++;

    // Anwesenheit = 1,00
    let points = 1.0;

    // Leistung
    if (entry.performance === "good") {
      points = 1.2;
    } else if (entry.performance === "bad") {
      points = 0.8;
    }

    // Zu spät = -0,10
    if (entry.late === true) {
      points -= 0.1;
      lateCount++;
    }

    total += points;
  });

  const totalTrainings = data.trainings.length;

  const attendanceRate =
    totalTrainings > 0
      ? (presentCount / totalTrainings) * 100
      : 0;

  const avgFactor =
    presentCount > 0
      ? total / presentCount
      : 0;

  return {
    total,
    presentCount,
    totalTrainings,
    lateCount,
    shortCancellationCount,
    attendanceRate,
    avgFactor
  };
}


// =========================
// SPIELER-LISTE
// =========================

function renderPlayers() {

  const list =
    document.getElementById(
      "playerList"
    );


  document.getElementById(
    "playerCount"
  ).textContent =
    `${data.players.length}/25`;


  if (!data.players.length) {

    list.innerHTML =
      `<div class="empty">
        Noch keine Spieler angelegt.
      </div>`;

    return;
  }


  list.innerHTML =
    [...data.players]

      .sort(
        (a, b) =>
          a.name.localeCompare(
            b.name,
            "de",
            {
              sensitivity: "base"
            }
          )
      )

      .map(
        player => `

          <div class="player-row">

            <span>
              ${escapeHtml(player.name)}
            </span>

            <button
              class="delete-btn"
              onclick="deletePlayer('${player.id}')">
              Löschen
            </button>

          </div>

        `
      )

      .join("");
}


// =========================
// TRAINING AUSWAHL
// =========================

function renderTrainingSelect() {

  const select =
    document.getElementById(
      "trainingSelect"
    );


  const trainings =
    [...data.trainings]
      .sort(
        (a, b) =>
          b.date.localeCompare(
            a.date
          )
      );


  if (!trainings.length) {

    select.innerHTML =
      `<option value="">
        Kein Training vorhanden
      </option>`;


    selectedTrainingId =
      null;


    document.getElementById(
      "selectedTrainingLabel"
    ).textContent =
      "Lege zuerst ein Training an.";


    const oldDeleteButton =
      document.getElementById(
        "deleteTrainingBtn"
      );


    if (oldDeleteButton) {
      oldDeleteButton.remove();
    }


    return;
  }


  if (
    !selectedTrainingId ||
    !trainings.some(
      t =>
        t.id ===
        selectedTrainingId
    )
  ) {

    selectedTrainingId =
      trainings[0].id;

  }


  select.innerHTML =
    trainings

      .map(
        training => `

          <option
            value="${training.id}"
            ${
              training.id ===
              selectedTrainingId
                ? "selected"
                : ""
            }>

            ${formatDate(
              training.date
            )}

          </option>

        `
      )

      .join("");


  const oldDeleteButton =
    document.getElementById(
      "deleteTrainingBtn"
    );


  if (oldDeleteButton) {
    oldDeleteButton.remove();
  }


  const deleteButton =
    document.createElement(
      "button"
    );


  deleteButton.id =
    "deleteTrainingBtn";


  deleteButton.textContent =
    "Training löschen";


  deleteButton.className =
    "delete-training-btn";


  deleteButton.onclick =
    () => {

      deleteTraining(
        selectedTrainingId
      );

    };


  select.parentElement.appendChild(
    deleteButton
  );


  const training =
    trainings.find(
      t =>
        t.id ===
        selectedTrainingId
    );


  document.getElementById(
    "selectedTrainingLabel"
  ).textContent =
    training

      ? `Ausgewählt: ${formatDate(
          training.date
        )}`

      : "";
}


// =========================
// ANWESENHEIT
// =========================

function renderAttendance() {

  const grid =
    document.getElementById(
      "attendanceGrid"
    );


  const training =
    data.trainings.find(
      t =>
        t.id ===
        selectedTrainingId
    );


  if (!training) {

    grid.innerHTML =
      `<div class="empty">
        Kein Training ausgewählt.
      </div>`;

    return;
  }


  if (!data.players.length) {

    grid.innerHTML =
      `<div class="empty">
        Lege zuerst Spieler an.
      </div>`;

    return;
  }


  grid.innerHTML =
    [...data.players]

      .sort(
        (a, b) =>
          a.name.localeCompare(
            b.name,
            "de",
            {
              sensitivity: "base"
            }
          )
      )

      .map(
        player => {

          const entry =
            getEntry(
              training,
              player.id
            );


          return `

            <div class="
              attendance-row
              ${
                entry.attendance === 0
                  ? "absent"
                  : ""
              }
            ">

              <div class="player-name">

                <b>
                  ${escapeHtml(
                    player.name
                  )}
                </b>

              </div>


              <!-- ABWESENHEIT -->

              <div class="absence-buttons">

                <button
                  class="
                    absent-btn
                    ${
                      entry.attendance === 0 &&
                      entry.cancellation !== "short"
                        ? "active absent"
                        : ""
                    }
                  "
                  onclick="
                    setEntry(
                      '${player.id}',
                      'attendance',
                      0
                    )
                  ">

                  ❌ Abwesend

                </button>


                <button
                  class="
                    short-cancel-btn
                    ${
                      entry.cancellation === "short"
                        ? "active short-cancel"
                        : ""
                    }
                  "
                  onclick="
                    setEntry(
                      '${player.id}',
                      'cancellation',
                      'short'
                    )
                  ">

                  ⚠️ Kurzfristig abgesagt

                </button>

              </div>


              <!-- LEISTUNG -->

              <div class="performance-buttons">

                <button
                  class="${
                    entry.performance === "good"
                      ? "active good"
                      : ""
                  }"
                  onclick="
                    setEntry(
                      '${player.id}',
                      'performance',
                      'good'
                    )
                  ">

                  🟢 Gut +20%

                </button>


                <button
                  class="${
                    entry.performance === "bad"
                      ? "active bad"
                      : ""
                  }"
                  onclick="
                    setEntry(
                      '${player.id}',
                      'performance',
                      'bad'
                    )
                  ">

                  🔴 Schlecht -20%

                </button>


                <button
                  class="${
                    entry.performance === "neutral"
                      ? "active neutral"
                      : ""
                  }"
                  onclick="
                    setEntry(
                      '${player.id}',
                      'performance',
                      'neutral'
                    )
                  ">

                  ➖ Neutral

                </button>


                <button
                  class="
                    late-btn
                    ${
                      entry.late === true
                        ? "active late"
                        : ""
                    }
                  "
                  onclick="
                    setEntry(
                      '${player.id}',
                      'late',
                      ${!entry.late}
                    )
                  ">

                  ⏰ Zu spät −10%

                </button>

              </div>

            </div>

          `;

        }
      )

      .join("");
}


// =========================
// RANGLISTE
// =========================

function renderRanking() {
  const body = document.getElementById("rankingBody");

  if (!body) {
    console.error("rankingBody wurde nicht gefunden.");
    return;
  }

  const rows = data.players
    .map(player => {
      const result = calculatePlayer(player.id);

      return {
        ...player,
        total: result.total,
        presentCount: result.presentCount,
        totalTrainings: result.totalTrainings,
        attendanceRate: result.attendanceRate,
        avgFactor: result.avgFactor,
        lateCount: result.lateCount,
        shortCancellationCount: result.shortCancellationCount
      };
    })
    .sort((a, b) => {
      if (b.total !== a.total) {
        return b.total - a.total;
      }

      return b.attendanceRate - a.attendanceRate;
    });

  if (!rows.length) {
    body.innerHTML = `
      <tr>
        <td colspan="6" class="empty">
          Noch keine Spieler vorhanden.
        </td>
      </tr>
    `;

    return;
  }

  body.innerHTML = rows
    .map((player, index) => `
      <tr>
        <td class="rank">
          ${index + 1}
        </td>

        <td>
          <b>
            ${escapeHtml(player.name)}
          </b>
        </td>

        <td>
          ${player.presentCount}/${player.totalTrainings}
        </td>

        <td>
          ${player.attendanceRate.toFixed(0)}%
        </td>

        <td>
          ${
            player.avgFactor !== 0
              ? player.avgFactor.toFixed(2)
              : "–"
          }
        </td>

        <td class="score">
          ${player.total.toFixed(2)}
        </td>
      </tr>
    `)
    .join("");
}


// =========================
// ALLES RENDERN
// =========================

function renderAll() {

  renderPlayers();

  renderTrainingSelect();

  renderAttendance();

  renderRanking();

}


// =========================
// HTML SICHER MACHEN
// =========================

function escapeHtml(value) {

  return String(value)

    .replaceAll(
      "&",
      "&amp;"
    )

    .replaceAll(
      "<",
      "&lt;"
    )

    .replaceAll(
      ">",
      "&gt;"
    )

    .replaceAll(
      '"',
      "&quot;"
    )

    .replaceAll(
      "'",
      "&#039;"
    );
}


// =========================
// EXPORT
// =========================

function exportData() {

  const blob =
    new Blob(
      [
        JSON.stringify(
          data,
          null,
          2
        )
      ],
      {
        type: "application/json"
      }
    );


  const url =
    URL.createObjectURL(
      blob
    );


  const a =
    document.createElement(
      "a"
    );


  a.href = url;


  a.download =
    `sportverein-tracker-${todayISO()}.json`;


  a.click();


  URL.revokeObjectURL(
    url
  );
}


// =========================
// IMPORT
// =========================

function importData(file) {

  const reader =
    new FileReader();


  reader.onload =
    async () => {

      try {

        const imported =
          JSON.parse(
            reader.result
          );


        if (
          !Array.isArray(
            imported.players
          ) ||
          !Array.isArray(
            imported.trainings
          )
        ) {

          throw new Error();

        }


        if (
          !confirm(
            "Aktuelle Daten durch die importierten Daten ersetzen?"
          )
        ) {

          return;

        }


        data =
          imported;


        selectedTrainingId =
          null;


        const success =
          await saveData();


        if (success) {

          showToast(
            "Daten importiert."
          );

        }


      } catch (error) {

        console.error(error);

        showToast(
          "Ungültige Datei."
        );

      }

    };


  reader.readAsText(
    file
  );
}


// =========================
// EVENT LISTENER
// =========================

document.getElementById(
  "trainingDate"
).value =
  todayISO();


document.getElementById(
  "addTrainingBtn"
).addEventListener(
  "click",
  addTraining
);


document.getElementById(
  "addPlayerBtn"
).addEventListener(
  "click",
  addPlayer
);


document.getElementById(
  "playerName"
).addEventListener(
  "keydown",
  event => {

    if (
      event.key === "Enter"
    ) {

      addPlayer();

    }

  }
);


document.getElementById(
  "trainingSelect"
).addEventListener(
  "change",
  event => {

    selectedTrainingId =
      event.target.value ||
      null;


    renderAttendance();

    renderTrainingSelect();

  }
);


document.getElementById(
  "exportBtn"
).addEventListener(
  "click",
  exportData
);


document.getElementById(
  "importInput"
).addEventListener(
  "change",
  event => {

    if (
      event.target.files[0]
    ) {

      importData(
        event.target.files[0]
      );

    }

  }
);


document.getElementById(
  "playerToggle"
).addEventListener(
  "click",
  () => {

    const content =
      document.getElementById(
        "playerManagementContent"
      );


    const arrow =
      document.getElementById(
        "playerArrow"
      );


    content.classList.toggle(
      "open"
    );


    arrow.textContent =
      content.classList.contains(
        "open"
      )

        ? "▲"

        : "▼";

  }
);


// =========================
// START
// =========================

async function init() {

  data =
    await loadData();


  // Sicherheitshalber alte /
  // fehlende Datenstrukturen korrigieren

  if (
    !data ||
    typeof data !== "object"
  ) {

    data = {
      players: [],
      trainings: []
    };

  }


  if (
    !Array.isArray(
      data.players
    )
  ) {

    data.players = [];

  }


  if (
    !Array.isArray(
      data.trainings
    )
  ) {

    data.trainings = [];

  }


  data.trainings.forEach(
    training => {

      if (!training.entries) {

        training.entries = {};

      }

    }
  );


  renderAll();

}


init();