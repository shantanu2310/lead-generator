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
      res = await fetch(url, options)
      networkError = null
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

  listUsers: () => request<any[]>("GET", "/auth/users"),

  setUserActive: (id: string, isActive: boolean) =>
    request<any>("PATCH", `/auth/users/${id}/active?is_active=${isActive}`),

  updateUser: (id: string, body: { name?: string; email?: string; password?: string; is_admin?: boolean }) =>
    request<any>("PATCH", `/auth/users/${id}`, body),

  deleteUser: (id: string) =>
    request<any>("DELETE", `/auth/users/${id}`),

  searchLeads: (body: { query: string; max_leads?: number }) =>
    request<any>("POST", "/leads/search", body),

  listLeads: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : ""
    return request<any>("GET", `/leads${qs}`)
  },

  getLead: (id: string) => request<any>("GET", `/leads/${id}`),

  updateLead: (id: string, body: any) =>
    request<any>("PATCH", `/leads/${id}`, body),

  moveLeadStage: (id: string, stage: string, reason?: string) =>
    request<any>("PATCH", `/leads/${id}/stage`, { stage, reason }),

  assignLead: (id: string, userId: string | null) =>
    request<any>("PATCH", `/leads/${id}/assign`, { user_id: userId }),

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
