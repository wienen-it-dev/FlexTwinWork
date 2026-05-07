// Datentypen fuer FlexWorkTwin Low-Code Aufgaben-Apps
// Modul 3 - basiert auf Workshop-Folien S.21 (Blocktypen) und S.22 (Aufgabenmetadaten)

export type BlockType =
  | 'anzeige'
  | 'eingabe'
  | 'multimedia'
  | 'werkzeug_param'
  | 'logik_if'
  | 'io_nio'
  | 'foto'
  | 'schnittstelle'
  | 'zaehler'
  | 'timer'
  | 'feedback'

export interface StepBase {
  id: string
  type: BlockType
}

export interface AnzeigeStep extends StepBase {
  type: 'anzeige'
  text: string
  imageUrl?: string
}

export interface EingabeStep extends StepBase {
  type: 'eingabe'
  label: string
  variable: string
  inputType: 'text' | 'number'
  unit?: string
}

export interface MultimediaStep extends StepBase {
  type: 'multimedia'
  mediaType: 'pdf' | 'video' | 'image'
  url: string
  title: string
}

export interface WerkzeugParamStep extends StepBase {
  type: 'werkzeug_param'
  toolName: string
  parameter: string
  sollwert: number
  einheit: string
}

export interface LogikIfStep extends StepBase {
  type: 'logik_if'
  variable: string
  operator: '<' | '<=' | '==' | '>=' | '>'
  threshold: number
  thenSteps: Step[]
  elseSteps: Step[]
}

export interface IoNioStep extends StepBase {
  type: 'io_nio'
  prompt: string
  requireComment: boolean
}

export interface FotoStep extends StepBase {
  type: 'foto'
  prompt: string
}

export interface SchnittstelleStep extends StepBase {
  type: 'schnittstelle'
  protocol: 'REST' | 'OPC UA' | 'MQTT'
  endpoint: string
  action: 'read' | 'write'
  payload?: string
}

export interface ZaehlerStep extends StepBase {
  type: 'zaehler'
  variable: string
  increment: number
}

export interface TimerStep extends StepBase {
  type: 'timer'
  seconds: number
  message: string
}

export interface FeedbackStep extends StepBase {
  type: 'feedback'
  question: string
}

export type Step =
  | AnzeigeStep
  | EingabeStep
  | MultimediaStep
  | WerkzeugParamStep
  | LogikIfStep
  | IoNioStep
  | FotoStep
  | SchnittstelleStep
  | ZaehlerStep
  | TimerStep
  | FeedbackStep

// Aufgabenmetadaten - Folie S.22 (MVP1-Fokus)
export interface AppMetadata {
  appId: string
  name: string
  version: string
  zielarbeitsplatztyp: string
  vorgabeZeit: string
  benoetigteSkills: string[]
  zertifikate: string[]
  stueckliste: BomItem[]
  werkzeugwechselplan: ToolChange[]
  pruefplaene: string
  arbeitsanweisung: string
  ergonomischeParameter: string
  geraetekonfiguration: string
  wartungsplaene: string
  zeichnungen: string[]
  checklisten: string[]
}

export interface BomItem {
  position: string
  bezeichnung: string
  menge: number
}

export interface ToolChange {
  schritt: string
  werkzeug: string
}

export interface TaskApp {
  metadata: AppMetadata
  steps: Step[]
  blocklyState?: object
}

// API-Wire-Typen (Antworten der n8n-Webhooks)
export interface AppListItem {
  id: string
  name: string
  status: 'draft' | 'test' | 'released' | 'archived'
  current_version: number
  updated_at: string
}

export interface AppDetail {
  id: string
  name: string
  status: AppListItem['status']
  current_version: number
  metadata: AppMetadata
  steps: Step[]
  blockly_state: object | null
  updated_at: string
}

export interface ExecutionStartResponse {
  execution_id: string
}
