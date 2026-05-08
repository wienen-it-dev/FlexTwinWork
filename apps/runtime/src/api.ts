import type { AppDetail, AppListItem, ExecutionStartResponse } from '@fwt/shared'

const BASE = (import.meta.env.VITE_N8N_BASE as string | undefined) ?? 'http://localhost:5678/webhook'

// n8n 1.85+ routet statische Pfade direkt (`/webhook/<path>`) und dynamische Pfade
// (mit `:param`) ueber den webhookId-Prefix (`/webhook/<webhookId>/<path>`).
// Daher pflegen wir die Webhook-IDs der :id-Endpunkte hier zentral.
const WHID = {
  appsGet: 'fwt-apps-get',
  execStep: 'fwt-exec-step',
  execFinish: 'fwt-exec-finish',
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
  // n8n liefert bei `responseMode: "lastNode"` und 0 Items einen leeren Body.
  const text = await res.text()
  if (!text.trim()) return undefined as T
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(`API: ungueltiges JSON in Antwort: ${text.slice(0, 200)}`)
  }
}

// Der List-Workflow verpackt die Postgres-Rows in { items: [...] }, weil n8n 1.85
// `responseData: "allEntries"` empirisch nicht zuverlaessig ein Array zurueckgibt.
// Diese Helper-Funktion kommt mit allen denkbaren Antwort-Shapes klar.
function normalizeList<T>(raw: unknown): T[] {
  if (raw === null || raw === undefined) return []
  if (Array.isArray(raw)) return raw as T[]
  if (typeof raw === 'object') {
    const obj = raw as { items?: unknown }
    if (Array.isArray(obj.items)) return obj.items as T[]
    return [raw as T]
  }
  return []
}

export const api = {
  // statisch: /webhook/apps
  listApps: async () => normalizeList<AppListItem>(await request<unknown>('/apps')),

  // dynamisch: /webhook/<whid>/apps/:id
  getApp: (id: string) =>
    request<AppDetail>(`/${WHID.appsGet}/apps/${encodeURIComponent(id)}`),

  // statisch: /webhook/executions
  startExecution: (appId: string, workplaceId?: string, workerId?: string) =>
    request<ExecutionStartResponse>('/executions', {
      method: 'POST',
      body: JSON.stringify({ app_id: appId, workplace_id: workplaceId, worker_id: workerId }),
    }),

  // dynamisch: /webhook/<whid>/executions/:id/step
  logStep: (
    executionId: string,
    payload: {
      step_index: number
      step_type: string
      step_id?: string
      outcome: string
      variables: Record<string, string | number>
    },
  ) =>
    request<{ ok: boolean }>(
      `/${WHID.execStep}/executions/${encodeURIComponent(executionId)}/step`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    ),

  // dynamisch: /webhook/<whid>/executions/:id/finish
  finishExecution: (executionId: string, status: 'finished' | 'aborted' = 'finished') =>
    request<{ ok: boolean }>(
      `/${WHID.execFinish}/executions/${encodeURIComponent(executionId)}/finish`,
      {
        method: 'POST',
        body: JSON.stringify({ status }),
      },
    ),

  // statisch: /webhook/integration/forward
  forwardIntegration: (payload: {
    protocol: 'OPC UA' | 'REST' | 'MQTT'
    endpoint: string
    action: 'read' | 'write'
    payload?: string
    execution_id?: string
  }) =>
    request<{ ok: boolean; result?: unknown }>('/integration/forward', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
}
