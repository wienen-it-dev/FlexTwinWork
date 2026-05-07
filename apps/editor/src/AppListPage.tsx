import type { AppListItem } from '@fwt/shared'

interface Props {
  apps: AppListItem[] | null
  error: string | null
  onReload: () => void
  onOpen: (id: string) => void
  onNew: () => void
}

export function AppListPage({ apps, error, onReload, onOpen, onNew }: Props) {
  return (
    <div className="app-list">
      <div className="app-list-header">
        <h2>Aufgaben-Apps</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={onReload}>Neu laden</button>
          <button className="btn btn-primary" onClick={onNew}>Neue App</button>
        </div>
      </div>

      {error && (
        <div className="error-msg" style={{ marginBottom: 16 }}>
          API-Fehler: {error}
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
            Stelle sicher, dass <code>docker compose up</code> laeuft und die n8n-Workflows aktiviert sind.
          </div>
        </div>
      )}

      {apps === null && !error && <div className="loading-state">Lade Apps...</div>}

      {apps !== null && apps.length === 0 && (
        <div className="loading-state">
          Noch keine Apps. <button className="btn btn-primary" onClick={onNew} style={{ marginLeft: 8 }}>Erste App anlegen</button>
        </div>
      )}

      {apps !== null && apps.length > 0 && (
        <div className="app-card-grid">
          {apps.map((a) => (
            <div className="app-card" key={a.id} onClick={() => onOpen(a.id)}>
              <div className="app-card-name">{a.name}</div>
              <div className="app-card-meta">
                <span>v{a.current_version}</span>
                <span>&middot;</span>
                <span>aktualisiert {new Date(a.updated_at).toLocaleString('de-DE')}</span>
              </div>
              <span className="status-badge" data-status={a.status}>{a.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
