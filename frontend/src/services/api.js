import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 120000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export async function login(email, password) {
  const { data } = await api.post('/auth/login', { email, password })
  return data
}

export async function getHealth() {
  const { data } = await api.get('/health')
  return data
}

export async function getDashboardStats() {
  const { data } = await api.get('/dashboard/stats')
  return data
}

export async function uploadDocument(file, categoryHint, authorized) {
  const form = new FormData()
  form.append('file', file)
  if (categoryHint) form.append('category_hint', categoryHint)
  form.append('authorized', String(authorized))
  const { data } = await api.post('/documents/upload', form)
  return data
}

export async function analyzeDocument(id, sync = true) {
  const { data } = await api.post(`/documents/${id}/analyze?sync=${sync}`)
  return data
}

export async function getDocument(id, reveal = false) {
  const { data } = await api.get(`/documents/${id}`, { params: { reveal } })
  return data
}

export async function listDocuments(params) {
  const { data } = await api.get('/documents', { params })
  return data
}

export async function updateReview(id, action, comment) {
  const { data } = await api.patch(`/documents/${id}/review`, { action, comment })
  return data
}

export async function getAuditLogs(page = 1) {
  const { data } = await api.get('/audit-logs', { params: { page } })
  return data
}

export function documentFileUrl(id) {
  return `/api/documents/${id}/file`
}

export function documentElaUrl(id) {
  return `/api/documents/${id}/ela`
}

export function documentReportUrl(id) {
  return `/api/documents/${id}/report`
}

export default api
