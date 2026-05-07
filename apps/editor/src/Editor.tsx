import { useEffect, useRef } from 'react'
import * as Blockly from 'blockly'
import { registerFwtBlocks, toolboxConfig, workspaceStateToSteps } from '@fwt/shared'
import type { TaskApp } from '@fwt/shared'
import { MetadataPanel } from './MetadataPanel'

interface Props {
  app: TaskApp
  onChange: (app: TaskApp) => void
}

// Hinweis: Diese Komponente sollte mit einem stabilen `key` (App-ID) gemountet werden.
// Bei App-Wechsel mountet React die Komponente neu - dann wird der Blockly-State frisch geladen.
// Der initiale State wird einmalig beim Mount gelesen; spaetere Aenderungen kommen von Blockly
// selbst und fliessen via `onChange` nach oben - kein Re-Load = kein Drag-Abbruch.
export function Editor({ app, onChange }: Props) {
  const blocklyDivRef = useRef<HTMLDivElement>(null)
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const appRef = useRef(app)
  appRef.current = app
  const initialStateRef = useRef<object | undefined>(app.blocklyState)
  initialStateRef.current = initialStateRef.current ?? app.blocklyState

  useEffect(() => {
    if (!blocklyDivRef.current || workspaceRef.current) return
    registerFwtBlocks()

    const ws = Blockly.inject(blocklyDivRef.current, {
      toolbox: toolboxConfig as unknown as Blockly.utils.toolbox.ToolboxDefinition,
      grid: { spacing: 20, length: 3, colour: '#ccc', snap: true },
      zoom: { controls: true, wheel: true, startScale: 0.95 },
      trashcan: true,
      renderer: 'zelos',
    })
    workspaceRef.current = ws

    // Initial-State einmalig laden (falls vorhanden)
    let isInitialLoad = true
    if (initialStateRef.current) {
      try {
        Blockly.serialization.workspaces.load(initialStateRef.current, ws)
      } catch (err) {
        console.error('Konnte initialen Blockly-State nicht laden:', err)
      }
    }
    isInitialLoad = false

    // Aenderungen am Workspace nach oben durchreichen.
    // UI-Events (drag/scroll/click) ignorieren - die aendern nichts am Programm.
    const listener = (event: Blockly.Events.Abstract) => {
      if (isInitialLoad) return
      if (event.isUiEvent) return
      if (event.type === Blockly.Events.FINISHED_LOADING) return
      const state = Blockly.serialization.workspaces.save(ws)
      const steps = workspaceStateToSteps(state as never)
      onChangeRef.current({ ...appRef.current, blocklyState: state, steps })
    }
    ws.addChangeListener(listener)

    // Resize-Handler - Blockly braucht das, sonst ist der Workspace fehlerhaft
    const resizeObserver = new ResizeObserver(() => {
      Blockly.svgResize(ws)
    })
    resizeObserver.observe(blocklyDivRef.current)

    return () => {
      resizeObserver.disconnect()
      ws.removeChangeListener(listener)
      ws.dispose()
      workspaceRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="editor">
      <div className="editor-blockly" ref={blocklyDivRef} />
      <MetadataPanel
        metadata={app.metadata}
        onChange={(metadata) => onChange({ ...app, metadata })}
      />
    </div>
  )
}
