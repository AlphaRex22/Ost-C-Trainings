# Sportverein Trainings-Tracker

## Start in Visual Studio Code

1. Entpacke den Ordner.
2. Öffne den Ordner `sportverein_tracker` in Visual Studio Code.
3. Öffne `index.html`.
4. Am einfachsten: Installiere in VS Code die Erweiterung **Live Server**.
5. Rechtsklick auf `index.html` → **Open with Live Server**.

Alternativ kannst du `index.html` direkt im Browser öffnen.

## Bedienung

Beim Anlegen bzw. Öffnen eines Trainings ist jeder Spieler automatisch als **anwesend** vorausgewählt.
Im normalen Interface wird deshalb "Anwesend" nicht mehr angezeigt. Du klickst nur dann auf **❌ Abwesend**, wenn der Spieler beim Training nicht da war.

Für jedes der letzten 20 Trainings gilt:

- Abwesend = 0,00
- Anwesend / neutral = 1,00
- Anwesend / gut = 1,20
- Anwesend / schlecht = 0,80

Die **Spieltag-Wertung** ist die Summe dieser Faktoren.

Beispiel:
20-mal anwesend und immer neutral = 20,00 Punkte.

20-mal anwesend und immer gut = 24,00 Punkte.

20-mal anwesend und immer schlecht = 16,00 Punkte.

Nicht eingetragene Leistung bleibt neutral (1,00), solange der Spieler als anwesend markiert ist.

## Daten

Die Daten werden lokal im Browser gespeichert. Mit "Daten exportieren" kannst du zusätzlich eine JSON-Sicherungsdatei erstellen und später wieder importieren.

## Hinweis

Wenn du einen Spieler bei einem Training nicht anklickst, gilt er automatisch als **anwesend + neutral (1,00)**. Nur mit "❌ Abwesend" wird der Trainingstag auf 0 gesetzt.


### Aktualisierung auf Version 2

Die Version 2 stellt Spieler standardmäßig auf **anwesend + neutral**. Bereits gespeicherte, noch nicht bearbeitete Einträge aus der ersten Version werden einmalig auf diesen Standard umgestellt.
