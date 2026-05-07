-- FlexWorkTwin Postgres Schema
-- Wird beim ersten Container-Start in /docker-entrypoint-initdb.d ausgefuehrt

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- Apps + Versionen
-- ============================================================

CREATE TABLE apps (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','test','released','archived')),
  current_version INT  NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE app_versions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id         UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  version        INT  NOT NULL,
  metadata       JSONB NOT NULL,
  steps          JSONB NOT NULL,
  blockly_state  JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (app_id, version)
);

CREATE INDEX idx_app_versions_app ON app_versions(app_id, version DESC);

-- ============================================================
-- Ausfuehrungen am Tisch (Werker laeuft eine App durch)
-- ============================================================

CREATE TABLE executions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id       UUID NOT NULL REFERENCES apps(id),
  app_version  INT  NOT NULL,
  worker_id    TEXT,            -- spaeter FK auf workers
  workplace_id TEXT,            -- spaeter FK auf workplaces (Tisch)
  started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at  TIMESTAMPTZ,
  status       TEXT NOT NULL DEFAULT 'running'
               CHECK (status IN ('running','finished','aborted')),
  variables    JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_executions_app ON executions(app_id, started_at DESC);

CREATE TABLE execution_steps (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id  UUID NOT NULL REFERENCES executions(id) ON DELETE CASCADE,
  step_index    INT  NOT NULL,
  step_type     TEXT NOT NULL,
  step_id       TEXT,
  outcome       TEXT,
  variables     JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_execution_steps_exec ON execution_steps(execution_id, step_index);

-- ============================================================
-- Beispiel-App seeden, damit Editor + Runtime out-of-the-box was anzeigen
-- ============================================================

WITH new_app AS (
  INSERT INTO apps (name, status, current_version)
  VALUES ('Drehmoment-Pruefung Schaltschrank', 'draft', 1)
  RETURNING id
)
INSERT INTO app_versions (app_id, version, metadata, steps, blockly_state)
SELECT
  new_app.id,
  1,
  jsonb_build_object(
    'appId', new_app.id::text,
    'name', 'Drehmoment-Pruefung Schaltschrank',
    'version', '0.1.0',
    'zielarbeitsplatztyp', 'Montagetisch (Typ A)',
    'vorgabeZeit', '4 min / Stueck',
    'benoetigteSkills', jsonb_build_array('Schraubmontage Stufe 2','Pruefprozess Basis'),
    'zertifikate', jsonb_build_array('ESD-geschult'),
    'stueckliste', jsonb_build_array(
      jsonb_build_object('position','1','bezeichnung','Schaltschrank-Gehaeuse','menge',1),
      jsonb_build_object('position','2','bezeichnung','Klemmenleiste 12-pol','menge',1),
      jsonb_build_object('position','3','bezeichnung','Zylinderschraube M4x10','menge',4),
      jsonb_build_object('position','4','bezeichnung','Federring M4','menge',4)
    ),
    'werkzeugwechselplan', jsonb_build_array(
      jsonb_build_object('schritt','Schritt 3','werkzeug','Drehmoment-Schrauber 1.5-3 Nm'),
      jsonb_build_object('schritt','Schritt 5','werkzeug','Pruefkamera (USB)')
    ),
    'pruefplaene', 'Sichtpruefung + Drehmoment 2.5 Nm pro Schraube. Toleranz +/- 0.2 Nm.',
    'arbeitsanweisung', 'Klemmenleiste mittig auf Gehaeuse positionieren, mit 4x M4x10 + Federring befestigen. Reihenfolge: ueber Kreuz anziehen.',
    'ergonomischeParameter', 'Tischhoehe: 95 cm (Stehposition). Beleuchtung: 750 lx neutralweiss.',
    'geraetekonfiguration', 'Drehmoment-Schrauber Bluetooth gekoppelt. Pruefkamera USB-Slot 1.',
    'wartungsplaene', 'Kalibrierung Drehmoment-Schrauber alle 6 Monate.',
    'zeichnungen', jsonb_build_array('ZG-2026-0042 Rev B','ZG-2026-0043 Rev A'),
    'checklisten', jsonb_build_array('ESD-Armband angelegt','Werkzeuge auf Vollstaendigkeit geprueft')
  ),
  jsonb_build_array(
    jsonb_build_object('id','s1','type','anzeige','text','Willkommen. Bitte ESD-Armband anlegen und Vollstaendigkeit der Werkzeuge pruefen.'),
    jsonb_build_object('id','s2','type','multimedia','mediaType','image','title','Zeichnung ZG-2026-0042 Rev B','url','https://placehold.co/800x500/0a4a6b/ffffff?text=Zeichnung+ZG-2026-0042'),
    jsonb_build_object('id','s3','type','eingabe','label','Auftragsnummer scannen oder eingeben','variable','auftragNr','inputType','text'),
    jsonb_build_object('id','s4','type','werkzeug_param','toolName','Drehmoment-Schrauber','parameter','Sollmoment','sollwert',2.5,'einheit','Nm'),
    jsonb_build_object('id','s5','type','anzeige','text','Schrauben ueber Kreuz anziehen. 4 Stueck M4x10 mit Federring.'),
    jsonb_build_object('id','s6','type','eingabe','label','Gemessenes Drehmoment Schraube 1','variable','m1','inputType','number','unit','Nm'),
    jsonb_build_object('id','s7','type','logik_if','variable','m1','operator','>=','threshold',2.3,
      'thenSteps', jsonb_build_array(
        jsonb_build_object('id','s7a','type','anzeige','text','Drehmoment im Toleranzbereich. Weiter mit Schraube 2.')
      ),
      'elseSteps', jsonb_build_array(
        jsonb_build_object('id','s7b','type','anzeige','text','Drehmoment ausserhalb Toleranz. Bitte nachziehen und erneut messen.'),
        jsonb_build_object('id','s7c','type','io_nio','prompt','Konnte Schraube nachgezogen werden?','requireComment',true)
      )
    ),
    jsonb_build_object('id','s8','type','foto','prompt','Bitte Sichtpruefungsfoto vom fertigen Schaltschrank aufnehmen.'),
    jsonb_build_object('id','s9','type','schnittstelle','protocol','OPC UA','endpoint','opc.tcp://server/ns=2;s=Auftrag.Status','action','write','payload','OK'),
    jsonb_build_object('id','s10','type','zaehler','variable','fertigeStueck','increment',1),
    jsonb_build_object('id','s11','type','feedback','question','War die Anleitung verstaendlich?')
  ),
  NULL
FROM new_app;
