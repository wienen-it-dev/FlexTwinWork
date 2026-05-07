import { useEffect, useState } from 'react'
import { AppPickerPage } from './AppPickerPage'
import { RunPage } from './RunPage'
import { api } from './api'
import type { AppListItem } from '@fwt/shared'

type Route =
  | { kind: 'pick' }
  | { kind: 'run'; appId: string }

export default function App() {
  const [route, setRoute] = useState<Route>({ kind: 'pick' })
  const [apps, setApps] = useState<AppListItem[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [apiOnline, setApiOnline] = useState<boolean>(true)

  async function reload() {
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
    if (route.kind === 'pick') reload()
  }, [route.kind])

  return (
    <div className="app">
      <header className="app-header">
        <div
          className="brand"
          onClick={() => setRoute({ kind: 'pick' })}
          style={{ cursor: 'pointer' }}
        >
          <div className="brand-logo runtime">FWT</div>
          <div>
            <div className="brand-title">FlexWorkTwin Runtime</div>
            <div className="brand-sub">Modul 3 &middot; Werker am Tisch</div>
          </div>
        </div>
        <div className="app-status">
          <span className={`status-dot ${apiOnline ? '' : 'offline'}`}></span>
          {apiOnline ? 'API verbunden' : 'API offline'}
        </div>
      </header>

      <main className="app-main">
        {route.kind === 'pick' && (
          <AppPickerPage
            apps={apps}
            error={loadError}
            onReload={reload}
            onPick={(id) => setRoute({ kind: 'run', appId: id })}
          />
        )}
        {route.kind === 'run' && (
          <RunPage
            appId={route.appId}
            onExit={() => setRoute({ kind: 'pick' })}
          />
        )}
      </main>
    </div>
  )
}
