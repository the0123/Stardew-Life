import api from './client'

export const logTask = (data: { category: string; effort: string; title: string }) =>
  api.post('/tasks/log', data)

export const getHistory = (limit = 20, offset = 0) =>
  api.get('/tasks/history', { params: { limit, offset } })

export const getStreaks = () => api.get('/tasks/streak')
