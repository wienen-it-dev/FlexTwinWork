import type { Step, LogikIfStep } from './types'

interface BlockNode {
  type: string
  id?: string
  fields?: Record<string, unknown>
  next?: { block: BlockNode }
  inputs?: Record<string, { block: BlockNode }>
}

export function stepsToWorkspaceState(steps: Step[]): object {
  const top = chainSteps(steps)
  if (!top) return { blocks: { languageVersion: 0, blocks: [] } }
  const first: BlockNode & { x?: number; y?: number } = { ...top, x: 40, y: 40 }
  return { blocks: { languageVersion: 0, blocks: [first] } }
}

function chainSteps(steps: Step[]): BlockNode | null {
  if (steps.length === 0) return null
  const head = stepToBlock(steps[0])
  let cursor = head
  for (let i = 1; i < steps.length; i++) {
    const next = stepToBlock(steps[i])
    cursor.next = { block: next }
    cursor = next
  }
  return head
}

function stepToBlock(s: Step): BlockNode {
  switch (s.type) {
    case 'anzeige':
      return { type: 'fwt_anzeige', fields: { TEXT: s.text } }
    case 'multimedia':
      return {
        type: 'fwt_multimedia',
        fields: { MEDIA_TYPE: s.mediaType, TITLE: s.title, URL: s.url },
      }
    case 'eingabe':
      return {
        type: 'fwt_eingabe',
        fields: {
          LABEL: s.label,
          VAR: s.variable,
          INPUT_TYPE: s.inputType,
          UNIT: s.unit ?? '',
        },
      }
    case 'feedback':
      return { type: 'fwt_feedback', fields: { QUESTION: s.question } }
    case 'io_nio':
      return {
        type: 'fwt_io_nio',
        fields: { PROMPT: s.prompt, COMMENT: s.requireComment },
      }
    case 'logik_if': {
      const ifStep = s as LogikIfStep
      const node: BlockNode = {
        type: 'fwt_logik_if',
        fields: {
          VAR: ifStep.variable,
          OP: ifStep.operator,
          THRESHOLD: ifStep.threshold,
        },
        inputs: {},
      }
      const thenHead = chainSteps(ifStep.thenSteps)
      const elseHead = chainSteps(ifStep.elseSteps)
      if (thenHead) node.inputs!.THEN = { block: thenHead }
      if (elseHead) node.inputs!.ELSE = { block: elseHead }
      return node
    }
    case 'werkzeug_param':
      return {
        type: 'fwt_werkzeug',
        fields: {
          TOOL: s.toolName,
          PARAM: s.parameter,
          SOLLWERT: s.sollwert,
          UNIT: s.einheit,
        },
      }
    case 'foto':
      return { type: 'fwt_foto', fields: { PROMPT: s.prompt } }
    case 'timer':
      return {
        type: 'fwt_timer',
        fields: { SECONDS: s.seconds, MESSAGE: s.message },
      }
    case 'schnittstelle':
      return {
        type: 'fwt_schnittstelle',
        fields: {
          PROTO: s.protocol,
          ENDPOINT: s.endpoint,
          ACTION: s.action,
          PAYLOAD: s.payload ?? '',
        },
      }
    case 'zaehler':
      return {
        type: 'fwt_zaehler',
        fields: { VAR: s.variable, INC: s.increment },
      }
  }
}
