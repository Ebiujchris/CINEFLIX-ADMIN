const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'

function getToken() {
  return localStorage.getItem('cf_admin_token') || ''
}

function authHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` }
}

export async function adminLogin(email: string, password: string) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Login failed')
  localStorage.setItem('cf_admin_token', data.token)
  localStorage.setItem('cf_admin_user', JSON.stringify(data.admin))
  return data
}

export function adminLogout() {
  localStorage.removeItem('cf_admin_token')
  localStorage.removeItem('cf_admin_user')
}

export function getAdminUser() {
  try { return JSON.parse(localStorage.getItem('cf_admin_user') || 'null') } catch { return null }
}

export async function fetchAllContent() {
  const res = await fetch(`${BASE}/api/content/admin/all`, { headers: authHeaders() })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error)
  return data.items
}

export async function importFromTmdb(type: string, tmdbId: string) {
  const res = await fetch(`${BASE}/api/content/tmdb/${type === 'SERIES' ? 'tv' : 'movie'}/${encodeURIComponent(tmdbId)}`, { headers: authHeaders() })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'TMDB import failed')
  return data
}

export async function createContent(payload: Record<string, unknown>) {
  const res = await fetch(`${BASE}/api/content`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error)
  return data
}

export async function updateContent(id: string, payload: Record<string, unknown>) {
  const res = await fetch(`${BASE}/api/content/${id}`, {
    method: 'PATCH', headers: authHeaders(), body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error)
  return data
}

export async function deleteContent(id: string) {
  const res = await fetch(`${BASE}/api/content/${id}`, {
    method: 'DELETE', headers: authHeaders(),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error)
  return data
}

export async function setupAdmin(email: string, password: string, name: string) {
  const res = await fetch(`${BASE}/api/auth/setup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error)
  return data
}
