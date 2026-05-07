import type { AppDetail, AppListItem, AppMetadata, Step } from '@fwt/shared'

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
  // n8n liefert manchmal ein Array zurueck
  const data = await res.json()
  return data as T
}

export const api = {
  listApps: () => request<AppListItem[]>('/apps'),

  getApp: (id: string) => request<AppDetail>(`/apps/${encodeURIComponent(id)}`),

  createApp: (payload: { name: string; metadata: AppMetadata; steps: Step[]; blockly_state?: object }) =>
    request<{ id: string }>('/apps', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateApp: (
    id: string,
    payload: { name?: string; metadata: AppMetadata; steps: Step[]; blockly_state?: object; status?: string },
  ) =>
    request<{ id: string; version: number }>(`/apps/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
}
