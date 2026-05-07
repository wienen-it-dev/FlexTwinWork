import { useEffect, useRef, useState } from 'react'
import { Editor } from './Editor'
import { api } from './api'
import { stepsToWorkspaceState } from '@fwt/shared'
import type { AppMetadata, Step, TaskApp } from '@fwt/shared'

interface Props {
  appId: string | null
  onBack: () => void
  onCreated?: (id: string) => void
}

const emptyMetadata: AppMetadata = {
  appId: '',
  name: 'Neue App',
  version: '0.1.0',
  zielarbeitsplatztyp: '',
  vorgabeZeit: '',
  benoetigteSkills: [],
  zertifikate: [],
  stueckliste: [],
  werkzeugwechselplan: [],
  pruefplaene: '',
  arbeitsanweisung: '',
  ergonomischeParameter: '',
  geraetekonfiguration: '',
  wartungsplaene: '',
  zeichnungen: [],
  checklisten: [],
}

export function EditorPage({ appId, onBack, onCreated }: Props) {
  const [app, setApp] = useState<TaskApp | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const lastSavedRef = useRef<string>('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    if (appId === null) {
      const blank: TaskApp = {
        metadata: { ...emptyMetadata },
        steps: [],
        blocklyState: stepsToWorkspaceState([]),
      }
      if (!cancelled) {
        setApp(blank)
        lastSavedRef.current = JSON.stringify(blank)
        setLoading(false)
      }
    } else {
      api
        .getApp(appId)
        .then((detail) => {
          if (cancelled) return
          const loaded: TaskApp = {
            metadata: detail.metadata,
            steps: detail.steps,
            blocklyState: detail.blockly_state ?? stepsToWorkspaceState(detail.steps),
          }
          setApp(loaded)
          lastSavedRef.current = JSON.stringify(loaded)
          setLoading(false)
        })
        .catch((err) => {
          if (cancelled) return
          setError(err instanceof Error ? err.message : String(err))
          setLoading(false)
        })
    }
    return () => {
      cancelled = true
    }
  }, [appId])

  function handleChange(next: TaskApp) {
    setApp(next)
    setDirty(JSON.stringify(next) !== lastSavedRef.current)
  }

  async function handleSave() {
    if (!app) return
    setSaving(true)
    setError(null)
    try {
      if (appId === null) {
        const created = await api.createApp({
          name: app.metadata.name || 'Neue App',
          metadata: app.metadata,
          steps: app.steps,
          blockly_state: app.blocklyState,
        })
        lastSavedRef.current = JSON.stringify(app)
        setDirty(false)
        onCreated?.(created.id)
      } else {
        await api.updateApp(appId, {
          name: app.metadata.name,
          metadata: app.metadata,
          steps: app.steps,
          blockly_state: app.blocklyState,
        })
        lastSavedRef.current = JSON.stringify(app)
        setDirty(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="loading-state">Lade App...</div>
  if (error && !app) return <div className="error-msg" style={{ margin: 24 }}>Fehler: {error}</div>
  if (!app) return null

  return (
    <div className="editor-page">
      <div className="editor-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost" onClick={onBack}>&larr; Zurueck</button>
          <input
            className="app-name"
            value={app.metadata.name}
            onChange={(e) => handleChange({ ...app, metadata: { ...app.metadata, name: e.target.value } })}
          />
          {dirty && <span className="dirty-indicator">&bull; ungespeichert</span>}
        </div>
        <div className="editor-toolbar-actions">
          {error && <span className="error-msg" style={{ padding: '4px 10px' }}>{error}</span>}
          <button className="btn btn-primary" onClick={handleSave} disabled={!dirty || saving}>
            {saving ? 'Speichere...' : appId === null ? 'App anlegen' : 'Speichern'}
          </button>
        </div>
      </div>
      <Editor key={appId ?? 'new'} app={app} onChange={handleChange} />
    </div>
  )
}
