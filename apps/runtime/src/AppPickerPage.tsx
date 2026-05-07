import type { AppListItem } from '@fwt/shared'

interface Props {
  apps: AppListItem[] | null
  error: string | null
  onReload: () => void
  onPick: (id: string) => void
}

export function AppPickerPage({ apps, error, onReload, onPick }: Props) {
  // Nur freigegebene + Test-Apps fuer Werker, draft ausblenden
  const visible = apps?.filter((a) => a.status !== 'archived') ?? null

  return (
    <div className="picker-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2>Welche Aufgabe soll ausgefuehrt werden?</h2>
        <button className="btn btn-ghost" onClick={onReload}>Neu laden</button>
      </div>

      {error && (
        <div className="error-msg" style={{ marginBottom: 16 }}>
          API-Fehler: {error}
        </div>
      )}

      {visible === null && !error && <div className="loading-state">Lade Aufgaben...</div>}

      {visible !== null && visible.length === 0 && (
        <div className="loading-state">
          Keine Aufgaben verfuegbar. Im Editor bitte zuerst eine App anlegen.
        </div>
      )}

      {visible !== null && visible.length > 0 && (
        <div className="picker-grid">
          {visible.map((a) => (
            <div className="picker-card" key={a.id} onClick={() => onPick(a.id)}>
              <div className="picker-card-name">{a.name}</div>
              <div className="picker-card-meta">
                Version {a.current_version} &middot;{' '}
                <span className="status-badge" data-status={a.status}>{a.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
