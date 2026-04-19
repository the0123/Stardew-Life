import api from './client'

export const login = (email: string, password: string) =>
  api.post('/auth/login', { email, password })

export const register = (data: {
  email: string
  username: string
  password: string
  display_name: string
  invite_code: string
}) => api.post('/auth/register', data)

export const logout = () => api.post('/auth/logout')

export const getMe = () => api.get('/auth/me')

export const refreshToken = () => api.post('/auth/refresh')
