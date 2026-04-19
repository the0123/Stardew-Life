import api from './client'

export const getMyFarm = () => api.get('/farm/me')
export const getFarmByUsername = (username: string) => api.get(`/farm/${username}`)
