import type { AppDetail, AppListItem, ExecutionStartResponse } from '@fwt/shared'

const BASE = (import.meta.env.VITE_N8N_BASE as string | undefined) ?? 'http://localhost:5678/webhook'

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
  return (await res.json()) as T
}

export const api = {
  listApps: () => request<AppListItem[]>('/apps'),
  getApp: (id: string) => request<AppDetail>(`/apps/${encodeURIComponent(id)}`),

  startExecution: (appId: string, workplaceId?: string, workerId?: string) =>
    request<ExecutionStartResponse>('/executions', {
      method: 'POST',
      body: JSON.stringify({ app_id: appId, workplace_id: workplaceId, worker_id: workerId }),
    }),

  logStep: (executionId: string, payload: {
    step_index: number
    step_type: string
    step_id?: string
    outcome: string
    variables: Record<string, string | number>
  }) =>
    request<{ ok: boolean }>(`/executions/${encodeURIComponent(executionId)}/step`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  finishExecution: (executionId: string, status: 'finished' | 'aborted' = 'finished') =>
    request<{ ok: boolean }>(`/executions/${encodeURIComponent(executionId)}/finish`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    }),

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
