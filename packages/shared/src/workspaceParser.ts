import type { Step } from './types'

interface BlocklyBlockNode {
  type: string
  id: string
  fields?: Record<string, string | number | boolean>
  next?: { block: BlocklyBlockNode }
  inputs?: Record<string, { block?: BlocklyBlockNode }>
}

interface BlocklyState {
  blocks?: { blocks?: BlocklyBlockNode[] }
}

export function workspaceStateToSteps(state: BlocklyState | null | undefined): Step[] {
  if (!state?.blocks?.blocks?.length) return []
  const top = state.blocks.blocks[0]
  return chainToSteps(top)
}

function chainToSteps(block: BlocklyBlockNode | undefined): Step[] {
  const steps: Step[] = []
  let current: BlocklyBlockNode | undefined = block
  while (current) {
    const step = blockToStep(current)
    if (step) steps.push(step)
    current = current.next?.block
  }
  return steps
}

function blockToStep(b: BlocklyBlockNode): Step | null {
  const f = b.fields ?? {}
  switch (b.type) {
    case 'fwt_anzeige':
      return { id: b.id, type: 'anzeige', text: String(f.TEXT ?? '') }
    case 'fwt_multimedia':
      return {
        id: b.id,
        type: 'multimedia',
        mediaType: (f.MEDIA_TYPE as 'image' | 'pdf' | 'video') ?? 'image',
        title: String(f.TITLE ?? ''),
        url: String(f.URL ?? ''),
      }
    case 'fwt_eingabe':
      return {
        id: b.id,
        type: 'eingabe',
        label: String(f.LABEL ?? ''),
        variable: String(f.VAR ?? ''),
        inputType: (f.INPUT_TYPE as 'text' | 'number') ?? 'text',
        unit: String(f.UNIT ?? ''),
      }
    case 'fwt_feedback':
      return { id: b.id, type: 'feedback', question: String(f.QUESTION ?? '') }
    case 'fwt_io_nio':
      return {
        id: b.id,
        type: 'io_nio',
        prompt: String(f.PROMPT ?? ''),
        requireComment: Boolean(f.COMMENT),
      }
    case 'fwt_logik_if':
      return {
        id: b.id,
        type: 'logik_if',
        variable: String(f.VAR ?? ''),
        operator: (f.OP as '<' | '<=' | '==' | '>=' | '>') ?? '>=',
        threshold: Number(f.THRESHOLD ?? 0),
        thenSteps: chainToSteps(b.inputs?.THEN?.block),
        elseSteps: chainToSteps(b.inputs?.ELSE?.block),
      }
    case 'fwt_werkzeug':
      return {
        id: b.id,
        type: 'werkzeug_param',
        toolName: String(f.TOOL ?? ''),
        parameter: String(f.PARAM ?? ''),
        sollwert: Number(f.SOLLWERT ?? 0),
        einheit: String(f.UNIT ?? ''),
      }
    case 'fwt_foto':
      return { id: b.id, type: 'foto', prompt: String(f.PROMPT ?? '') }
    case 'fwt_timer':
      return {
        id: b.id,
        type: 'timer',
        seconds: Number(f.SECONDS ?? 0),
        message: String(f.MESSAGE ?? ''),
      }
    case 'fwt_schnittstelle':
      return {
        id: b.id,
        type: 'schnittstelle',
        protocol: (f.PROTO as 'OPC UA' | 'REST' | 'MQTT') ?? 'REST',
        endpoint: String(f.ENDPOINT ?? ''),
        action: (f.ACTION as 'read' | 'write') ?? 'write',
        payload: String(f.PAYLOAD ?? ''),
      }
    case 'fwt_zaehler':
      return {
        id: b.id,
        type: 'zaehler',
        variable: String(f.VAR ?? ''),
        increment: Number(f.INC ?? 1),
      }
    default:
      return null
  }
}
