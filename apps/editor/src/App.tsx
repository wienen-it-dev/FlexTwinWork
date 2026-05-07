import { useEffect, useState } from 'react'
import { AppListPage } from './AppListPage'
import { EditorPage } from './EditorPage'
import { api } from './api'
import type { AppListItem } from '@fwt/shared'

type Route =
  | { kind: 'list' }
  | { kind: 'edit'; appId: string }
  | { kind: 'new' }

export default function App() {
  const [route, setRoute] = useState<Route>({ kind: 'list' })
  const [apps, setApps] = useState<AppListItem[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [apiOnline, setApiOnline] = useState<boolean>(true)

  async function reloadApps() {
    setLoadError(null)
    try {
      const list = await api.listApps()
      setApps(list)
      setApiOnline(true)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Unbekannter Fehler')
      setApiOnline(false)
    }
  }

  useEffect(() => {
    if (route.kind === 'list') reloadApps()
  }, [route.kind])

  return (
    <div className="app">
      <header className="app-header">
        <div
          className="brand"
          onClick={() => setRoute({ kind: 'list' })}
          style={{ cursor: 'pointer' }}
        >
          <div className="brand-logo">FWT</div>
          <div>
            <div className="brand-title">FlexWorkTwin Editor</div>
            <div className="brand-sub">Modul 3 &middot; Arbeitsvorbereitung</div>
          </div>
        </div>
        <div className="app-status">
          <span className={`status-dot ${apiOnline ? '' : 'offline'}`}></span>
          {apiOnline ? 'API verbunden' : 'API offline'}
        </div>
      </header>

      <main className="app-main">
        {route.kind === 'list' && (
          <AppListPage
            apps={apps}
            error={loadError}
            onReload={reloadApps}
            onOpen={(id) => setRoute({ kind: 'edit', appId: id })}
            onNew={() => setRoute({ kind: 'new' })}
          />
        )}
        {route.kind === 'edit' && (
          <EditorPage
            appId={route.appId}
            onBack={() => setRoute({ kind: 'list' })}
          />
        )}
        {route.kind === 'new' && (
          <EditorPage
            appId={null}
            onBack={() => setRoute({ kind: 'list' })}
            onCreated={(id) => setRoute({ kind: 'edit', appId: id })}
          />
        )}
      </main>
    </div>
  )
}
