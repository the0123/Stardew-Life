import api from './client'

export interface PushSubscribePayload {
  endpoint: string
  p256dh: string
  auth: string
}

export async function getVapidKey(): Promise<string> {
  const { data } = await api.get('/push/vapid-key')
  return data.vapid_public_key as string
}

export async function subscribePush(payload: PushSubscribePayload): Promise<void> {
  await api.post('/push/subscribe', payload)
}

export async function unsubscribePush(endpoint: string): Promise<void> {
  await api.delete('/push/subscribe', { params: { endpoint } })
}
