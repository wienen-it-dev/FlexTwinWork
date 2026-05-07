import { useEffect, useRef, useState } from 'react'
import { api } from './api'
import { StepRenderer } from './StepRenderer'
import type { AppDetail, Step } from '@fwt/shared'

interface Props {
  appId: string
  onExit: () => void
}

interface LogEntry {
  step: Step
  outcome: string
}

export function RunPage({ appId, onExit }: Props) {
  const [detail, setDetail] = useState<AppDetail | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [executionId, setExecutionId] = useState<string | null>(null)
  const [queue, setQueue] = useState<Step[] | null>(null)
  const [vars, setVars] = useState<Record<string, string | number>>({})
  const [log, setLog] = useState<LogEntry[]>([])
  const [done, setDone] = useState(false)
  const stepCounter = useRef(0)

  // App + Execution starten
  useEffect(() => {
    let cancelled = false
    setLoadError(null)
    setQueue(null)

    Promise.all([api.getApp(appId), api.startExecution(appId)])
      .then(([d, ex]) => {
        if (cancelled) return
        setDetail(d)
        setExecutionId(ex.execution_id)
        setQueue([...d.steps])
        setVars({})
        setLog([])
        setDone(false)
        stepCounter.current = 0
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
  }, [appId])

  if (loadError) {
    return (
      <div className="error-msg" style={{ margin: 24 }}>
        Konnte App / Ausfuehrung nicht starten: {loadError}
        <div style={{ marginTop: 12 }}>
          <button className="btn btn-ghost" onClick={onExit}>Zurueck</button>
        </div>
      </div>
    )
  }

  if (!detail || queue === null) return <div className="loading-state">Lade Aufgabe...</div>

  const current = queue[0]

  async function advance(outcome: string, varUpdates?: Record<string, string | number>) {
    if (!current || !executionId) return
    const newVars = varUpdates ? { ...vars, ...varUpdates } : vars
    let newQueue = queue!.slice(1)

    if (current.type === 'logik_if') {
      const v = newVars[current.variable]
      const numV = typeof v === 'number' ? v : parseFloat(String(v ?? 'NaN'))
      let cond = false
      switch (current.operator) {
        case '<': cond = numV < current.threshold; break
        case '<=': cond = numV <= current.threshold; break
        case '==': cond = numV === current.threshold; break
        case '>=': cond = numV >= current.threshold; break
        case '>': cond = numV > current.threshold; break
      }
      const branch = cond ? current.thenSteps : current.elseSteps
      newQueue = [...branch, ...newQueue]
      const branchOutcome = `${current.variable}=${numV} ${current.operator} ${current.threshold} -> ${cond ? 'THEN' : 'ELSE'}`
      setLog((l) => [...l, { step: current, outcome: branchOutcome }])
      void logToApi(current, branchOutcome, newVars)
    } else {
      setLog((l) => [...l, { step: current, outcome }])
      void logToApi(current, outcome, newVars)
    }

    if (current.type === 'zaehler') {
      const cur = Number(newVars[current.variable] ?? 0)
      newVars[current.variable] = cur + current.increment
    }

    setVars(newVars)
    setQueue(newQueue)

    // Logik-Block kann ganz oben stehen -> sofort weiter-evaluieren
    if (newQueue.length > 0 && newQueue[0].type === 'logik_if') {
      setTimeout(() => evalLogikChain(newQueue, newVars), 0)
    } else if (newQueue.length === 0) {
      setDone(true)
      try { await api.finishExecution(executionId, 'finished') } catch {}
    }
  }

  function evalLogikChain(q: Step[], v: Record<string, string | number>) {
    let queueLocal = q
    let varsLocal = { ...v }
    while (queueLocal.length > 0 && queueLocal[0].type === 'logik_if') {
      const lf = queueLocal[0]
      if (lf.type !== 'logik_if') break
      const value = varsLocal[lf.variable]
      const numV = typeof value === 'number' ? value : parseFloat(String(value ?? 'NaN'))
      let cond = false
      switch (lf.operator) {
        case '<': cond = numV < lf.threshold; break
        case '<=': cond = numV <= lf.threshold; break
        case '==': cond = numV === lf.threshold; break
        case '>=': cond = numV >= lf.threshold; break
        case '>': cond = numV > lf.threshold; break
      }
      const branch = cond ? lf.thenSteps : lf.elseSteps
      const branchOutcome = `${lf.variable}=${numV} ${lf.operator} ${lf.threshold} -> ${cond ? 'THEN' : 'ELSE'}`
      setLog((l) => [...l, { step: lf, outcome: branchOutcome }])
      void logToApi(lf, branchOutcome, varsLocal)
      queueLocal = [...branch, ...queueLocal.slice(1)]
    }
    setQueue(queueLocal)
    if (queueLocal.length === 0) {
      setDone(true)
      if (executionId) api.finishExecution(executionId, 'finished').catch(() => {})
    }
  }

  async function logToApi(step: Step, outcome: string, vars: Record<string, string | number>) {
    if (!executionId) return
    try {
      await api.logStep(executionId, {
        step_index: stepCounter.current++,
        step_type: step.type,
        step_id: step.id,
        outcome,
        variables: vars,
      })
    } catch (err) {
      console.warn('logStep failed', err)
    }
  }

  async function abort() {
    if (executionId) {
      try { await api.finishExecution(executionId, 'aborted') } catch {}
    }
    onExit()
  }

  return (
    <div className="runtime">
      <div className="runtime-main">
        <div className="runtime-topbar">
          <div className="runtime-app-info">
            <div className="runtime-app-name">{detail.metadata.name}</div>
            <div className="runtime-app-meta">
              {detail.metadata.zielarbeitsplatztyp || '–'} &middot; v{detail.metadata.version} &middot; Vorgabe {detail.metadata.vorgabeZeit || '–'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" onClick={abort}>Abbrechen</button>
          </div>
        </div>

        {done ? (
          <div className="runtime-done">
            <h2>Aufgabe abgeschlossen</h2>
            <p>Alle Schritte wurden ausgefuehrt und an die Plattform gemeldet.</p>
            <button className="btn btn-primary" onClick={onExit}>Zurueck zur Aufgabenauswahl</button>
          </div>
        ) : current ? (
          <StepRenderer
            step={current}
            stepIndex={log.length + 1}
            totalSteps={log.length + queue.length}
            vars={vars}
            executionId={executionId}
            onNext={advance}
          />
        ) : (
          <div className="runtime-empty">Keine Schritte definiert.</div>
        )}
      </div>

      <aside className="runtime-side">
        <section className="side-section">
          <h3>Variablen</h3>
          {Object.keys(vars).length === 0 ? (
            <div className="muted">noch keine</div>
          ) : (
            <table className="meta-table">
              <tbody>
                {Object.entries(vars).map(([k, v]) => (
                  <tr key={k}><td>{k}</td><td>{String(v)}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="side-section">
          <h3>Verlauf ({log.length})</h3>
          <ol className="log-list">
            {log.map((l, i) => (
              <li key={i}>
                <span className="log-type">{l.step.type}</span>
                <span className="log-outcome">{l.outcome}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="side-section">
          <h3>Skills / Zertifikate</h3>
          <ul className="meta-list">
            {detail.metadata.benoetigteSkills.map((s, i) => <li key={i}>{s}</li>)}
            {detail.metadata.zertifikate.map((s, i) => <li key={'z' + i}>{s} (Zert.)</li>)}
          </ul>
        </section>

        <section className="side-section">
          <h3>Stueckliste</h3>
          {detail.metadata.stueckliste.length > 0 ? (
            <table className="meta-table">
              <tbody>
                {detail.metadata.stueckliste.map((b, i) => (
                  <tr key={i}><td>{b.position}</td><td>{b.bezeichnung}</td><td>{b.menge}x</td></tr>
                ))}
              </tbody>
            </table>
          ) : <div className="muted">–</div>}
        </section>
      </aside>
    </div>
  )
}
