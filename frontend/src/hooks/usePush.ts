import { useCallback, useEffect, useState } from 'react'
import { getVapidKey, subscribePush, unsubscribePush } from '../api/push'

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}

export function usePush() {
  const [supported, setSupported] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (
      !('serviceWorker' in navigator) ||
      !('PushManager' in window) ||
      !('Notification' in window)
    ) return
    setSupported(true)
    navigator.serviceWorker.ready.then(reg =>
      reg.pushManager.getSubscription().then(sub => setSubscribed(!!sub))
    )
  }, [])

  const subscribe = useCallback(async () => {
    setLoading(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return
      const vapidKey = await getVapidKey()
      if (!vapidKey) return
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        // Cast required: Uint8Array<ArrayBufferLike> vs ArrayBufferView<ArrayBuffer> in TS strict mode
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as ArrayBuffer,
      })
      const json = sub.toJSON()
      await subscribePush({
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh ?? '',
        auth: json.keys?.auth ?? '',
      })
      setSubscribed(true)
    } finally {
      setLoading(false)
    }
  }, [])

  const unsubscribe = useCallback(async () => {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (!sub) return
      await unsubscribePush(sub.endpoint)
      await sub.unsubscribe()
      setSubscribed(false)
    } finally {
      setLoading(false)
    }
  }, [])

  return { supported, subscribed, loading, subscribe, unsubscribe }
}
