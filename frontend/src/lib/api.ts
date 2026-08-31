import { API_BASE } from "./constants"
import { clearAuth, getToken } from "./auth"

class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
    this.name = "ApiError"
  }
}

const NETWORK_RETRIES = 5
const NETWORK_RETRY_DELAYS = [5000, 10000, 20000, 30000, 30000]
const RETRYABLE_STATUS = [408, 429, 502, 503, 504]

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms))

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  opts?: { skipAuth?: boolean }
): Promise<T> {
  const url = `${API_BASE}/api/v1${path}`
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  const token = getToken()
  if (token && !opts?.skipAuth) {
    headers.Authorization = `Bearer ${token}`
  }
  const options: RequestInit = {
    method,
    headers,
  }
  if (body && method !== "GET") {
    options.body = JSON.stringify(body)
  }

  let res: Response | null = null
  let networkError: any = null
  for (let attempt = 0; attempt <= NETWORK_RETRIES; attempt++) {
    try {
      const r = await fetch(url, options)
      if (RETRYABLE_STATUS.includes(r.status) && attempt < NETWORK_RETRIES) {
        r.body?.cancel()
        await sleep(NETWORK_RETRY_DELAYS[attempt] ?? 5000)
        continue
      }
      res = r
      break
    } catch (err: any) {
      networkError = err
      if (attempt < NETWORK_RETRIES) {
        await sleep(NETWORK_RETRY_DELAYS[attempt] ?? 5000)
      }
    }
  }

  if (!res) {
    throw new ApiError(
      `Cannot reach the server (it may be waking up from idle) — please wait a moment and retry. (${method} ${url})`,
      0
    )
  }

  if (res.status === 401 && typeof window !== "undefined") {
    clearAuth()
    if (!window.location.pathname.startsWith("/login")) {
      window.location.href = "/login"
    }
  }
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    const reason = errBody.error?.message || errBody.detail || res.statusText
    throw new ApiError(`${reason} — ${method} ${url}`, res.status)
  }
  return res.json()
}

export const api = {
  login: (body: { email: string; password: string }) =>
    request<any>("POST", "/auth/login", body),

  registerUser: (body: { email: string; password: string; name: string; company_name?: string }, opts?: { public?: boolean }) =>
    request<any>("POST", "/auth/register", body, { skipAuth: opts?.public }),

  getMe: () => request<any>("GET", "/auth/me"),

  updateMe: (body: { name?: string; password?: string; avatar_url?: string | null }) =>
    request<any>("PATCH", "/auth/me", body),

  listUsers: () => request<any[]>("GET", "/auth/users"),

  setUserActive: (id: string, isActive: boolean) =>
    request<any>("PATCH", `/auth/users/${id}/active?is_active=${isActive}`),

  updateUser: (id: string, body: { name?: string; email?: string; password?: string; is_admin?: boolean; avatar_url?: string | null }) =>
    request<any>("PATCH", `/auth/users/${id}`, body),

  deleteUser: (id: string) =>
    request<any>("DELETE", `/auth/users/${id}`),

  searchLeads: (body: { query: string; max_leads?: number; department_id: string }) =>
    request<any>("POST", "/leads/search", body),

  listLeads: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : ""
    return request<any>("GET", `/leads${qs}`)
  },

  exportLeads: async (params?: Record<string, string>): Promise<void> => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : ""
    const url = `${API_BASE}/api/v1/leads/export.csv${qs}`
    const token = getToken()
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) throw new Error(`Export failed (${res.status})`)
    const blob = await res.blob()
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = "leads.csv"
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(link.href)
  },

  deleteLead: (id: string) => request<any>("DELETE", `/leads/${id}`),

  deleteContact: (leadId: string, contactId: string) =>
    request<any>("DELETE", `/leads/${leadId}/contacts/${contactId}`),

  deleteSearch: (id: string) => request<any>("DELETE", `/searches/${id}`),

  restoreSearch: (id: string) => request<any>("PATCH", `/searches/${id}/restore`),

  listDepartments: () => request<any>("GET", "/departments"),

  createDepartment: (name: string) =>
    request<any>("POST", "/departments", { name }),

  updateDepartment: (id: string, name: string) =>
    request<any>("PATCH", `/departments/${id}`, { name }),

  deleteDepartment: (id: string) =>
    request<any>("DELETE", `/departments/${id}`),

  getLead: (id: string) => request<any>("GET", `/leads/${id}`),

  updateLead: (id: string, body: any) =>
    request<any>("PATCH", `/leads/${id}`, body),

  moveLeadStage: (id: string, stage: string, reason?: string) =>
    request<any>("PATCH", `/leads/${id}/stage`, { stage, reason }),

  assignLead: (id: string, userId: string | null) =>
    request<any>("PATCH", `/leads/${id}/assign`, { user_id: userId }),

  bulkAssignLeads: (leadIds: string[], userId: string | null) =>
    request<any>("POST", "/leads/bulk-assign", { lead_ids: leadIds, user_id: userId }),

  bulkMoveStage: (leadIds: string[], stage: string) =>
    request<any>("POST", "/leads/bulk-stage", { lead_ids: leadIds, stage }),

  bulkDeleteLeads: (leadIds: string[]) =>
    request<any>("POST", "/leads/bulk-delete", { lead_ids: leadIds }),

  getContactActivities: (id: string) =>
    request<any[]>("GET", `/leads/${id}/contact-activities`),

  createContactActivity: (id: string, body: any) =>
    request<any>("POST", `/leads/${id}/contact-activities`, body),

  getLeadTimeline: (id: string) => request<any[]>("GET", `/leads/${id}/timeline`),

  getLeadContacts: (id: string) => request<any[]>("GET", `/leads/${id}/contacts`),

  createContact: (leadId: string, body: any) =>
    request<any>("POST", `/leads/${leadId}/contacts`, body),

  getPipelineStages: () => request<any[]>("GET", "/pipeline/stages"),

  getPipelineAnalytics: (searchId?: string) =>
    request<any>("GET", `/pipeline/analytics${searchId ? `?search_id=${encodeURIComponent(searchId)}` : ""}`),

  getPipelineInsights: (limit?: number) =>
    request<any[]>("GET", `/pipeline/insights${limit ? `?limit=${limit}` : ""}`),

  getPipelineDashboard: () =>
    request<any>("GET", "/pipeline/dashboard"),

  getTeamLeads: (perUserLimit?: number) =>
    request<any>("GET", `/pipeline/team-leads${perUserLimit ? `?per_user_limit=${perUserLimit}` : ""}`),

  getDueFollowups: (horizonHours?: number) =>
    request<any[]>("GET", `/leads/followups/due${horizonHours ? `?horizon_hours=${horizonHours}` : ""}`),

  getNotifications: (unreadOnly?: boolean) =>
    request<any[]>("GET", `/notifications${unreadOnly ? "?unread_only=true" : ""}`),

  markNotificationRead: (id: string) =>
    request<any>("PATCH", `/notifications/${id}/read`),

  markAllNotificationsRead: () =>
    request<any>("PATCH", "/notifications/read-all"),

  getUnreadCount: () => request<{ count: number }>("GET", "/notifications/unread-count"),

  getSettings: () => request<any>("GET", "/settings"),

  updateProviderSettings: (body: any) =>
    request<any>("PATCH", "/settings/providers", body),

  updatePipelineSettings: (body: any) =>
    request<any>("PATCH", "/settings/pipeline", body),

  listSearches: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : ""
    return request<any>("GET", `/searches${qs}`)
  },
}
