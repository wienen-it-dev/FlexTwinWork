import type { AppDetail, AppListItem, AppMetadata, Step } from '@fwt/shared'

const BASE = (import.meta.env.VITE_N8N_BASE as string | undefined) ?? 'http://localhost:5678/webhook'

// n8n 1.85+ routet statische Pfade direkt (`/webhook/<path>`) und dynamische Pfade
// (mit `:param`) ueber den webhookId-Prefix (`/webhook/<webhookId>/<path>`).
// Daher pflegen wir die Webhook-IDs der :id-Endpunkte hier zentral.
const WHID = {
  appsGet: 'fwt-apps-get',
  appsUpdate: 'fwt-apps-update',
} as const

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`API ${res.status} ${res.statusText}: ${text}`)
  }
  const data = await res.json()
  return data as T
}

export const api = {
  // statisch: /webhook/apps
  listApps: () => request<AppListItem[]>('/apps'),

  // dynamisch: /webhook/<whid>/apps/:id
  getApp: (id: string) =>
    request<AppDetail>(`/${WHID.appsGet}/apps/${encodeURIComponent(id)}`),

  // statisch: /webhook/apps
  createApp: (payload: { name: string; metadata: AppMetadata; steps: Step[]; blockly_state?: object }) =>
    request<{ id: string }>('/apps', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // dynamisch: /webhook/<whid>/apps/:id
  updateApp: (
    id: string,
    payload: { name?: string; metadata: AppMetadata; steps: Step[]; blockly_state?: object; status?: string },
  ) =>
    request<{ id: string; version: number }>(
      `/${WHID.appsUpdate}/apps/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
    ),
}
