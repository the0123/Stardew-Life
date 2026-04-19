import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
})

api.interceptors.response.use(
  response => response,
  async error => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry && !original.url?.includes('/auth/')) {
      original._retry = true
      try {
        const { data } = await api.post('/auth/refresh')
        api.defaults.headers.common['Authorization'] = `Bearer ${data.access_token}`
        original.headers['Authorization'] = `Bearer ${data.access_token}`
        return api(original)
      } catch {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

export default api
