"use client"

export type AuthUser = {
  id: string
  company_id: string
  company_name?: string
  email: string
  name: string
  is_active: boolean
  is_admin: boolean
  created_at?: string
}

const TOKEN_KEY = "leadgen_token"
const USER_KEY = "leadgen_user"
const AUTH_EVENT = "auth:changed"

export function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setAuth(token: string, user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
  window.dispatchEvent(new Event(AUTH_EVENT))
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  window.dispatchEvent(new Event(AUTH_EVENT))
}

export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

export function isLoggedIn(): boolean {
  return getToken() !== null
}

export function logout() {
  clearAuth()
  if (typeof window !== "undefined") {
    window.location.href = "/login"
  }
}
