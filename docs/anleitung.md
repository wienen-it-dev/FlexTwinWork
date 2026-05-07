# FlexWorkTwin — Bedienungsanleitung

So funktioniert das Modul-3-System aus Sicht aller Nutzergruppen: Arbeitsvorbereitung (AV), Werker am Tisch, Admin/Entwickler.

> **Im Lehrbuchsatz:** Eine **Aufgaben-App** ist eine Folge von **Blöcken**, die der Werker am Tisch Schritt für Schritt durchläuft. Die AV baut diese Apps im **Editor** zusammen. Sie werden in **Postgres** gespeichert. Die **Runtime** lädt eine App und führt sie aus. Hinter den Kulissen orchestriert **n8n** die Datenflüsse.

---

## Inhalt

1. [Architektur-Überblick](#1-architektur-überblick)
2. [Editor (AV) — Apps bauen](#2-editor-av--apps-bauen)
3. [Runtime (Werker) — Apps ausführen](#3-runtime-werker--apps-ausführen)
4. [Block-Referenz](#4-block-referenz)
5. [n8n-Bedienung](#5-n8n-bedienung)
6. [Postgres-Inspektion](#6-postgres-inspektion)
7. [Erweitern: neuer Block-Typ](#7-erweitern-neuer-block-typ)
8. [Erweitern: neuer API-Endpunkt](#8-erweitern-neuer-api-endpunkt)
9. [Bekannte Limits / Roadmap](#9-bekannte-limits--roadmap)

---

## 1. Architektur-Überblick

```
┌─────────────────┐       ┌─────────────────┐
│  Editor (AV)    │       │ Runtime (Werker)│
│  Port 5174      │       │  Port 5175      │
└────────┬────────┘       └────────┬────────┘
         │                         │
         └────── HTTP/JSON ────────┤
                                   ▼
                         ┌──────────────────┐
                         │       n8n        │
                         │   Port 5678      │
                         │   (Webhooks)     │
                         └────────┬─────────┘
                                  │
                         ┌────────▼─────────┐
                         │    Postgres      │
                         │   Port 5432      │
                         └──────────────────┘
```

**Trennung der Verantwortlichkeiten:**

| Komponente | Aufgabe |
|---|---|
| Editor | App-Definition (Blöcke + Metadaten) bauen, speichern, versionieren |
| Runtime | App laden, Werker durchführen lassen, Schritte loggen |
| n8n | API-Endpunkte als Webhook-Workflows; perspektivisch: ERP-/OPC-UA-/MQTT-Anbindung |
| Postgres | Quelle der Wahrheit: alle Apps, Versionen, Ausführungen, Schritt-Logs |

**Wichtig:** Editor und Runtime kennen sich nicht direkt. Beide reden ausschließlich mit n8n. Das macht es trivial, später einen Editor-Client (Tablet, Web) auszutauschen oder mehrere Runtime-Instanzen (mehrere Tische) parallel zu betreiben.

---

## 2. Editor (AV) — Apps bauen

### 2.1 App-Liste

Beim Aufruf von `http://<host>/editor/` siehst du alle nicht-archivierten Apps als Karten.

- Jede Karte zeigt **Name**, **aktuelle Versionsnummer**, **Status-Badge** (`draft` / `test` / `released` / `archived`), **letzte Änderung**.
- Klick auf eine Karte → Editor öffnet die App.
- Button **"Neue App"** oben rechts → leerer Editor.
- Rechts oben im Header: **Status-Indikator** (grün = API verbunden, rot = n8n unerreichbar).

### 2.2 Editor-Ansicht

Der Editor besteht aus drei Bereichen:

```
┌──────────────────────────────────────────────────────────┐
│ [< Zurück]  App-Name                       [Speichern]   │ ← Toolbar
├──────────────────────────────────────────────────────────┤
│                                                          │
│   ┌─Toolbox──┐                          ┌──────────────┐ │
│   │ HMI      │                          │ Aufgaben-    │ │
│   │ Eingabe  │      Workspace           │ metadaten    │ │
│   │ Logik    │      (Blöcke)            │              │ │
│   │ HW       │                          │ Stückliste,  │ │
│   │ Daten    │                          │ Skills, ...  │ │
│   └──────────┘                          └──────────────┘ │
└──────────────────────────────────────────────────────────┘
```

**Toolbar (oben):**

- **App-Name** ist editierbar (einfach reinklicken).
- **Speichern** legt eine **neue Version** in Postgres an. Vorherige Versionen bleiben erhalten — das ist wichtig für Audit/Rollback (siehe Folie S.24 "Apps müssen versioniert ... werden können").
- Wenn ungespeicherte Änderungen vorhanden sind, erscheint ein **"• ungespeichert"**-Hinweis und der Speichern-Button wird aktiv.

**Workspace (Mitte):**

- Aus der **Toolbox** (linke Sidebar) Blöcke per Drag & Drop in den Workspace ziehen.
- Blöcke verbinden sich oben/unten wie Puzzleteile (Sequenz).
- Logik-Block hat zwei innere Slots ("dann" / "sonst"), die andere Blöcke aufnehmen.
- Rechtsklick auf einen Block: Duplizieren, Löschen, Kommentar etc.
- Maus-Wheel zoomt; Trashcan rechts unten löscht; Steuerelemente rechts unten zeigen Zoom +/-, Center.
- **Toolbox-Kategorien:**
  - **HMI / Anzeige** (blau)
  - **Eingabe / Feedback** (cyan)
  - **Logik** (violett)
  - **Werkzeug / Hardware** (orange)
  - **Daten / Schnittstellen** (grün)

**Metadaten-Panel (rechts):**

Felder gemäß Folie S.22 (MVP1-Fokus):

- Allgemein: Version, Zielarbeitsplatztyp, Vorgabe Zeit/Stück
- Skills & Zertifikate (komma-getrennt)
- Stückliste, Werkzeugwechselplan (aktuell read-only Tabellen — pflegen via DB oder spätere Editor-Erweiterung)
- Zeichnungen, Checklisten (read-only Listen)
- Prüfpläne, Arbeitsanweisung, Ergonomische Parameter, Gerätekonfiguration, Wartungspläne (Free-Text)

Änderungen am Metadaten-Panel sind genauso "ungespeichert" wie Block-Änderungen — beide landen mit dem Save-Button gemeinsam in einer neuen Version.

### 2.3 Workflow für eine neue App

1. **"Neue App"** klicken.
2. App-Namen oben in der Toolbar eingeben.
3. Blöcke aus der Toolbox in den Workspace ziehen, sequenziell verbinden.
4. Felder in den Blöcken ausfüllen (Texte, Variablennamen, URLs, Sollwerte etc.).
5. Bei Bedarf einen **Logik-Block** einsetzen, in den "dann" / "sonst" weitere Blöcke ziehen.
6. Rechts im Metadaten-Panel die Pflichtangaben für die Werker-Ansicht hinterlegen (Vorgabe-Zeit, benötigte Skills, Zielarbeitsplatztyp, Arbeitsanweisung).
7. **Speichern** → die App ist als Version 1 in der DB.
8. **Zurück** zur Liste — die App taucht jetzt mit Status `draft` auf.

### 2.4 Workflow für eine bestehende App (Update)

1. Karte in der Liste klicken.
2. Änderungen vornehmen.
3. **Speichern** → Postgres legt eine neue Version an, `apps.current_version` wird hochgezählt. Alte Version bleibt in `app_versions` erhalten.

> **Aktuell nicht im Frontend:** Versionsverlauf einsehen, Versionen vergleichen, Rollback. In der DB ist alles vorhanden, eine UI dafür ist Roadmap.

### 2.5 Status-Übergänge

Die Status-Werte (`draft` / `test` / `released` / `archived`) sind in der DB als Constraint gepflegt, im Editor-Frontend aber noch **nicht** als Workflow umgesetzt — alle neuen Apps bleiben auf `draft`. Aktuell musst du Status-Wechsel manuell via SQL setzen:

```sql
UPDATE apps SET status = 'released' WHERE id = '<UUID>';
```

Sobald `status = 'released'`, wird die App in der Runtime auch wirklich angezeigt (Filter: alles außer `archived`). Diese Logik ist absichtlich grosszügig im Test-Setup; für Produktion solltest du das im AppPickerPage-Filter auf `released` einschränken (siehe S.23 "Freigabeprozess").

---

## 3. Runtime (Werker) — Apps ausführen

### 3.1 App-Picker

Beim Aufruf von `http://<host>/runtime/` zeigt der Werker eine große, Touch-freundliche Auswahl aller verfügbaren Aufgaben.

- Karten sind groß genug für Tablet-Bedienung.
- Status `archived` wird nicht angezeigt.
- Klick auf eine Karte → die Ausführung beginnt.

Beim Klick passiert:

1. Runtime ruft `GET /webhook/apps/:id` (lädt die aktuelle Version inkl. Steps + Metadaten).
2. Runtime ruft `POST /webhook/executions` (legt einen neuen `executions`-Datensatz in Postgres an, bekommt `execution_id` zurück).
3. Schritt 1 wird angezeigt.

### 3.2 Ausführungs-Ansicht

```
┌──────────────────────────────────────────────────────────┐
│ App-Name                              [Abbrechen]        │
├──────────────────────────────┬───────────────────────────┤
│                              │                           │
│   Schritt 3 / ~12  [Eingabe] │  Variablen                │
│                              │   auftragNr = "12345"     │
│   Bitte Drehmoment messen.   │                           │
│   ┌─────────────┐            │  Verlauf (3)              │
│   │  2.4    Nm  │            │   anzeige  bestaetigt     │
│   └─────────────┘            │   eingabe  m1 = 2.4 Nm    │
│   [Weiter]                   │                           │
│                              │  Skills / Zertifikate     │
│                              │   • Schraubmontage L2     │
│                              │   • ESD-geschult (Zert.)  │
│                              │                           │
│                              │  Stückliste               │
│                              │   1  Gehäuse        1x    │
│                              │   2  Klemmenleiste  1x    │
│                              │   ...                     │
└──────────────────────────────┴───────────────────────────┘
```

**Hauptbereich:**

- Oben: Fortschritt (Schritt N / ungefähre Gesamtzahl) + Block-Typ-Badge (farbcodiert wie Toolbox).
- Mitte: Block-spezifische Eingabe (siehe Block-Referenz).
- Unten: Großer **"Weiter"**-Button.

**Sidebar rechts:**

- **Variablen**: alle bisher erfassten Werte mit Variablennamen.
- **Verlauf**: chronologische Liste der ausgeführten Schritte mit Outcome.
- **Skills / Zertifikate**: was die App fordert.
- **Stückliste**: Material zum Abhaken.

### 3.3 Was beim Schritt-Wechsel passiert

Jeder "Weiter"-Klick triggert:

1. Aktueller Schritt wird im lokalen State geloggt.
2. Variablen werden aktualisiert (z. B. der gemessene Wert).
3. **`POST /webhook/executions/:id/step`** schickt Schritt-Index, Block-Typ, Outcome und Variablen an n8n. n8n schreibt nach `execution_steps` und aktualisiert `executions.variables`.
4. Logik-Blöcke werden automatisch ausgewertet — der Werker sieht sie nie. Die Verzweigungs-Entscheidung wird trotzdem geloggt.
5. Schnittstellen-Blöcke rufen synchron `POST /webhook/integration/forward` auf und zeigen das Ergebnis an. Bei Fehler kann der Werker "erneut versuchen" oder "trotzdem weiter".
6. Am Ende: **`POST /webhook/executions/:id/finish`** mit Status `finished` (oder `aborted` beim Klick auf Abbrechen).

Damit bleibt kein Schritt undokumentiert — die DB enthält für jede Ausführung den vollständigen Pfad.

---

## 4. Block-Referenz

### 4.1 HMI / Anzeige (blau)

| Block | Felder | Werker sieht |
|---|---|---|
| **Anzeige** | Text (mehrzeilig) | Nur Text + "Weiter" |
| **Multimedia** | Typ (Bild / PDF / Video), Titel, URL | Bild eingebettet; PDF/Video als Platzhalter (in Demo) |

### 4.2 Eingabe / Feedback (cyan)

| Block | Felder | Werker sieht |
|---|---|---|
| **Eingabe** | Label, Variable, Typ (Zahl/Text), Einheit | Großes Eingabefeld → Wert wird in Variable gespeichert |
| **IO / NIO** | Frage, "Kommentar erforderlich" | Zwei große Buttons (grün/rot); bei NIO Pflichtkommentar |
| **Feedback** | Frage | 1–5 Sterne-Rating |

### 4.3 Logik (violett)

| Block | Felder | Werker sieht |
|---|---|---|
| **Wenn-dann-sonst** | Variable, Operator (>, >=, ==, <, <=), Schwellwert; "dann"-Slot, "sonst"-Slot | Nichts — wird automatisch evaluiert. Im Verlauf erscheint "var=X op Y → THEN/ELSE" |

### 4.4 Werkzeug / Hardware (orange)

| Block | Felder | Werker sieht |
|---|---|---|
| **Werkzeug parametrieren** | Werkzeug, Parameter, Sollwert, Einheit | Soll-Wert-Anzeige + Button "Sollwert an Werkzeug senden" → Bestätigung |
| **Foto aufnehmen** | Hinweis | Button "Foto aufnehmen", Platzhalter (Demo) |
| **Timer** | Sekunden, Hinweis | Countdown — Weiter ist gesperrt bis Timer abgelaufen |

### 4.5 Daten / Schnittstellen (grün)

| Block | Felder | Werker sieht |
|---|---|---|
| **Schnittstelle** | Protokoll (OPC UA/REST/MQTT), Endpunkt, Aktion (read/write), Payload | Übersicht + Button "Aktion via n8n ausführen" → Erfolg/Fehler |
| **Zähler** | Variable, Inkrement | Hinweis-Anzeige + Weiter (Zähler erhöht sich automatisch) |

> **Wichtig:** "Schnittstelle" delegiert an `POST /webhook/integration/forward`. Aktuell ist der Workflow ein **Stub**, der einen simulierten Erfolg zurückgibt. Für echten OPC-UA-/MQTT-/REST-Aufruf den Stub-Workflow in n8n um die echten Nodes erweitern (siehe Abschnitt 5).

---

## 5. n8n-Bedienung

### 5.1 UI öffnen

`http://<host>:5678/`

> Bei neuerer n8n-Version ggf. einmalig einen Owner-Account anlegen (Email + Passwort). Das ist eine reine Login-Hürde, alle anderen Daten bleiben.

In der UI siehst du links eine Sidebar mit "Workflows" und "Executions".

### 5.2 Workflows einsehen

Klick auf "Workflows" — die acht FWT-Workflows (`FWT - GET /apps`, `FWT - POST /executions/:id/step`, ...) sind als aktive Workflows gelistet.

- Klick auf einen Workflow → grafische Ansicht: Webhook → Postgres → Respond.
- Im **"Test workflow"**-Modus kannst du den Webhook live triggern und siehst, welcher Wert wo durchläuft. Nützlich zum Debugging.

### 5.3 Executions ansehen (Debugging)

Klick auf "Executions" — chronologische Liste aller Webhook-Aufrufe mit Status (success/error/running).

- Klick auf eine Execution → siehst die Daten, die in jedem Node ein- und ausgegangen sind.
- Bei Fehler: rote Markierung, du siehst den exakten SQL-Fehler / Validierungsfehler.

> Wenn die Frontends "API offline" oder einen 5xx-Fehler zeigen, ist das die erste Anlaufstelle.

### 5.4 Workflow ändern

Beispiel: dem Schnittstellen-Block echtes Forwarding geben.

1. Workflow `FWT - POST /integration/forward` öffnen.
2. Den "Forward (Stub)"-Code-Node entfernen oder duplizieren.
3. Ein **"Switch"**-Node einfügen, das nach `body.protocol` (REST/OPC UA/MQTT) verzweigt.
4. Pro Zweig den entsprechenden Node:
   - REST: HTTP-Request-Node → `body.endpoint`, Methode `POST`, Body `body.payload`
   - MQTT: MQTT-Node (publish) → Broker-URL, Topic, Message
   - OPC UA: aktuell kein nativer n8n-Node, also via HTTP-Bridge (z.B. `node-opcua-server` oder Python-Service)
5. Speichern. Die Frontends nutzen die neue Logik beim nächsten Schnittstellen-Block automatisch.

### 5.5 Workflows in den Code zurückspielen

Wenn du einen Workflow in der UI änderst, sollte das geänderte JSON ins Repo:

```bash
# Workflow exportieren via CLI
docker exec fwt-n8n n8n export:workflow --id=<WORKFLOW_ID> \
  --output=/tmp/wf.json
docker cp fwt-n8n:/tmp/wf.json ./n8n/workflows/08-integration-forward.json
```

Dann committen. Beim nächsten frischen Stack-Aufbau ist der neue Stand sofort dabei.

---

## 6. Postgres-Inspektion

### 6.1 In den Container

```bash
docker exec -it fwt-postgres psql -U fwt -d flexworktwin
```

### 6.2 Sample-Queries

```sql
-- Alle Apps
SELECT id, name, status, current_version, updated_at FROM apps;

-- Versionsverlauf einer App
SELECT version, created_at, jsonb_array_length(steps) AS num_steps
FROM app_versions WHERE app_id = '<UUID>' ORDER BY version DESC;

-- Letzte 10 Ausführungen
SELECT e.id, a.name, e.status, e.started_at, e.finished_at,
       jsonb_pretty(e.variables) AS vars
FROM executions e JOIN apps a ON a.id = e.app_id
ORDER BY started_at DESC LIMIT 10;

-- Schritt-Verlauf einer Ausführung
SELECT step_index, step_type, outcome, jsonb_pretty(variables)
FROM execution_steps WHERE execution_id = '<UUID>'
ORDER BY step_index;

-- Wieviel Zeit pro Werker je Auftrag (Beispiel-Aggregation)
SELECT worker_id,
       AVG(EXTRACT(EPOCH FROM (finished_at - started_at))) AS avg_seconds
FROM executions WHERE status = 'finished'
GROUP BY worker_id;
```

### 6.3 Tabellen-Übersicht

| Tabelle | Zweck |
|---|---|
| `apps` | Stamm-Datensatz pro App (ID, Name, Status, current_version) |
| `app_versions` | Versionierte Inhalte (metadata, steps, blockly_state) als JSONB |
| `executions` | Eine Werker-Durchführung — App-Bezug, Start/Ende, Status, finale Variablen |
| `execution_steps` | Detail-Log: Schritt-Index, Outcome, Variable-Snapshot |

Das ist die Grundlage für sämtliche Analytik (Dauer pro Schritt, Fehlerquote, Auslastung) — siehe Folie S.18 "Auslesen Daten DAT - Prozessoptimierung".

---

## 7. Erweitern: neuer Block-Typ

Beispiel: einen "Barcode-Scan"-Block einbauen, der einen Code per Kamera erfasst.

**Vier Stellen sind betroffen:**

1. `packages/shared/src/types.ts` — neuen `BarcodeScanStep` zum `Step`-Union hinzufügen.
2. `packages/shared/src/blockDefs.ts` — Block-Definition (`type: 'fwt_barcode'`, Felder, Farbe). Toolbox-Kategorie ergänzen.
3. `packages/shared/src/workspaceParser.ts` und `stepsToWorkspace.ts` — Mapping zwischen Blockly-JSON und Step.
4. `apps/runtime/src/StepRenderer.tsx` — `BarcodeScanView`-React-Komponente mit der Werker-Ansicht.

Nach Code-Änderung: `npm run typecheck` auf Root-Ebene zeigt sofort, wenn ein `switch` exhaustiv geprüft werden muss aber den neuen Typ vergisst.

---

## 8. Erweitern: neuer API-Endpunkt

Beispiel: `GET /webhook/apps/:id/versions` — alle Versionen einer App auflisten.

1. **In n8n-UI** neuen Workflow anlegen.
2. **Webhook-Node**: Methode GET, Path `apps/:id/versions`, Response Mode `responseNode`.
3. **Postgres-Node**:
   ```sql
   SELECT version, created_at,
          jsonb_array_length(steps) AS num_steps
   FROM app_versions WHERE app_id = $1::uuid ORDER BY version DESC
   ```
   Query Replacement: `={{ JSON.stringify([$json.params.id]) }}`
4. **Respond-to-Webhook-Node**: Respond With `allIncomingItems`.
5. Workflow aktivieren.
6. Workflow exportieren (siehe 5.5) und ins Repo unter `n8n/workflows/09-app-versions.json` legen.
7. Im Frontend (`apps/editor/src/api.ts`) eine Methode `listVersions(id)` ergänzen.

---

## 9. Bekannte Limits / Roadmap

Aus dem Projekt-Workshop (Folien S.23, S.24, S.30) sind bewusst noch nicht abgebildet:

| Thema | Aktuell | Roadmap |
|---|---|---|
| **App-Validierung** vor Save (Folie 23) | keine | Pflichtparameter-Check, Skill-Anforderungen, Sprachvarianten, fehlende Geräte-Hinweise |
| **Freigabeprozess** mit Rollen (Autor/Freigeber/Deployer) | nur Status-Feld in DB | UI-Workflow, Audit-Log |
| **Simulation / Preview** vor Deployment | – | "Test-Modus" im Editor, der die Runtime ohne DB-Schreibzugriff zeigt |
| **Mehrsprachigkeit** in Block-Inhalten | – | i18n-Schicht über Aufgabenmetadaten |
| **App-Versionierung** im UI | DB hat alles, UI nicht | Version-History, Diff, Rollback |
| **Schnittstellen-Block** mit echtem Forwarding | Stub | Ausbau des `08-integration-forward`-Workflows pro Protokoll |
| **HDT-Anbindung (M4)** | – | Endpoint, der Werker-ID + Aufgabenausgang an Qualifikationsmodul liefert |
| **Tisch-/Werker-Stammdaten** | freie Text-Felder in `executions` | eigene Tabellen + UI |
| **Editor für Stückliste / Werkzeugwechselplan / Zeichnungen** | read-only Anzeige | Add/Edit-Buttons im Metadaten-Panel |
| **Echtzeit-Synchronisation** (Folie 15) | – | WebSocket-Stream `/webhook/executions/:id/stream` mit Live-Status |

Wenn du eines dieser Themen angehst, ist die Reihenfolge oben grob nach **"höchster Hebel zuerst"** sortiert: Validierung + Freigabeprozess sind nötig, bevor das System produktiv eingesetzt wird; alles darunter erweitert den Funktionsumfang ohne Hard-Block.
