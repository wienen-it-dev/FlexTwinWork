import * as Blockly from 'blockly/core'

const COLORS = {
  hmi: '#2563eb',
  input: '#0891b2',
  logic: '#7c3aed',
  hardware: '#ea580c',
  data: '#16a34a',
}

export const blockDefinitions = [
  {
    type: 'fwt_anzeige',
    message0: 'Anzeige %1 Text %2',
    args0: [
      { type: 'input_dummy' },
      { type: 'field_multilinetext', name: 'TEXT', text: 'Hinweis fuer den Werker...' },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: COLORS.hmi,
    tooltip: 'Zeigt dem Werker einen Text/Hinweis an.',
  },
  {
    type: 'fwt_multimedia',
    message0: 'Multimedia %1 Typ %2 Titel %3 URL %4',
    args0: [
      { type: 'input_dummy' },
      {
        type: 'field_dropdown',
        name: 'MEDIA_TYPE',
        options: [
          ['Bild', 'image'],
          ['PDF', 'pdf'],
          ['Video', 'video'],
        ],
      },
      { type: 'field_input', name: 'TITLE', text: 'Zeichnung ZG-...' },
      { type: 'field_input', name: 'URL', text: 'https://...' },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: COLORS.hmi,
    tooltip: 'Bindet PDF, Bild oder Video ein.',
  },
  {
    type: 'fwt_eingabe',
    message0: 'Eingabe %1 Label %2 Variable %3 Typ %4 Einheit %5',
    args0: [
      { type: 'input_dummy' },
      { type: 'field_input', name: 'LABEL', text: 'Drehmoment messen' },
      { type: 'field_input', name: 'VAR', text: 'mWert' },
      {
        type: 'field_dropdown',
        name: 'INPUT_TYPE',
        options: [
          ['Zahl', 'number'],
          ['Text', 'text'],
        ],
      },
      { type: 'field_input', name: 'UNIT', text: 'Nm' },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: COLORS.input,
    tooltip: 'Werker gibt einen Wert ein.',
  },
  {
    type: 'fwt_feedback',
    message0: 'Feedback erfassen %1 Frage %2',
    args0: [
      { type: 'input_dummy' },
      { type: 'field_input', name: 'QUESTION', text: 'War die Anleitung verstaendlich?' },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: COLORS.input,
    tooltip: 'Werker kann Feedback zur Anleitung geben.',
  },
  {
    type: 'fwt_io_nio',
    message0: 'IO / NIO Entscheidung %1 Frage %2 Kommentar erforderlich %3',
    args0: [
      { type: 'input_dummy' },
      { type: 'field_input', name: 'PROMPT', text: 'Pruefung in Ordnung?' },
      { type: 'field_checkbox', name: 'COMMENT', checked: false },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: COLORS.input,
    tooltip: 'Werker bestaetigt OK oder meldet NIO.',
  },
  {
    type: 'fwt_logik_if',
    message0: 'Wenn Variable %1 %2 %3 dann %4 sonst %5',
    args0: [
      { type: 'field_input', name: 'VAR', text: 'mWert' },
      {
        type: 'field_dropdown',
        name: 'OP',
        options: [
          ['groesser gleich', '>='],
          ['groesser', '>'],
          ['gleich', '=='],
          ['kleiner', '<'],
          ['kleiner gleich', '<='],
        ],
      },
      { type: 'field_number', name: 'THRESHOLD', value: 0 },
      { type: 'input_statement', name: 'THEN' },
      { type: 'input_statement', name: 'ELSE' },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: COLORS.logic,
    tooltip: 'Logische Verzweigung.',
  },
  {
    type: 'fwt_werkzeug',
    message0: 'Werkzeug parametrieren %1 Werkzeug %2 Parameter %3 Sollwert %4 Einheit %5',
    args0: [
      { type: 'input_dummy' },
      { type: 'field_input', name: 'TOOL', text: 'Drehmoment-Schrauber' },
      { type: 'field_input', name: 'PARAM', text: 'Sollmoment' },
      { type: 'field_number', name: 'SOLLWERT', value: 2.5 },
      { type: 'field_input', name: 'UNIT', text: 'Nm' },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: COLORS.hardware,
    tooltip: 'Setzt einen Sollwert auf einem Werkzeug.',
  },
  {
    type: 'fwt_foto',
    message0: 'Foto aufnehmen %1 Hinweis %2',
    args0: [
      { type: 'input_dummy' },
      { type: 'field_input', name: 'PROMPT', text: 'Pruefungsfoto aufnehmen' },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: COLORS.hardware,
    tooltip: 'Werker macht Foto.',
  },
  {
    type: 'fwt_timer',
    message0: 'Timer %1 Sekunden %2 Hinweis %3',
    args0: [
      { type: 'input_dummy' },
      { type: 'field_number', name: 'SECONDS', value: 30, min: 1 },
      { type: 'field_input', name: 'MESSAGE', text: 'Bitte 30s aushaerten lassen' },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: COLORS.hardware,
    tooltip: 'Wartet eine definierte Zeit.',
  },
  {
    type: 'fwt_schnittstelle',
    message0: 'Schnittstelle %1 Protokoll %2 Endpunkt %3 Aktion %4 Payload %5',
    args0: [
      { type: 'input_dummy' },
      {
        type: 'field_dropdown',
        name: 'PROTO',
        options: [
          ['OPC UA', 'OPC UA'],
          ['REST', 'REST'],
          ['MQTT', 'MQTT'],
        ],
      },
      { type: 'field_input', name: 'ENDPOINT', text: 'opc.tcp://...' },
      {
        type: 'field_dropdown',
        name: 'ACTION',
        options: [
          ['schreiben', 'write'],
          ['lesen', 'read'],
        ],
      },
      { type: 'field_input', name: 'PAYLOAD', text: 'OK' },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: COLORS.data,
    tooltip: 'Datenaustausch mit Drittsystem.',
  },
  {
    type: 'fwt_zaehler',
    message0: 'Zaehler %1 Variable %2 erhoehen um %3',
    args0: [
      { type: 'input_dummy' },
      { type: 'field_input', name: 'VAR', text: 'fertigeStueck' },
      { type: 'field_number', name: 'INC', value: 1 },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: COLORS.data,
    tooltip: 'Erhoeht eine Zaehlervariable.',
  },
]

let registered = false
export function registerFwtBlocks() {
  if (registered) return
  Blockly.common.defineBlocksWithJsonArray(blockDefinitions)
  registered = true
}

export const toolboxConfig = {
  kind: 'categoryToolbox',
  contents: [
    {
      kind: 'category',
      name: 'HMI / Anzeige',
      colour: COLORS.hmi,
      contents: [
        { kind: 'block', type: 'fwt_anzeige' },
        { kind: 'block', type: 'fwt_multimedia' },
      ],
    },
    {
      kind: 'category',
      name: 'Eingabe / Feedback',
      colour: COLORS.input,
      contents: [
        { kind: 'block', type: 'fwt_eingabe' },
        { kind: 'block', type: 'fwt_io_nio' },
        { kind: 'block', type: 'fwt_feedback' },
      ],
    },
    {
      kind: 'category',
      name: 'Logik',
      colour: COLORS.logic,
      contents: [{ kind: 'block', type: 'fwt_logik_if' }],
    },
    {
      kind: 'category',
      name: 'Werkzeug / Hardware',
      colour: COLORS.hardware,
      contents: [
        { kind: 'block', type: 'fwt_werkzeug' },
        { kind: 'block', type: 'fwt_foto' },
        { kind: 'block', type: 'fwt_timer' },
      ],
    },
    {
      kind: 'category',
      name: 'Daten / Schnittstellen',
      colour: COLORS.data,
      contents: [
        { kind: 'block', type: 'fwt_schnittstelle' },
        { kind: 'block', type: 'fwt_zaehler' },
      ],
    },
  ],
}
