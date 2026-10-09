import { useEffect, useState } from 'react'
import api from '../services/api'

export default function AuthenticatedImage({ url, alt, className }) {
  const [src, setSrc] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let objectUrl
    let cancelled = false
    api
      .get(url, { responseType: 'blob' })
      .then((res) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(res.data)
        setSrc(objectUrl)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [url])

  if (failed) {
    return <div className={`flex items-center justify-center bg-slate-100 text-xs text-slate-500 ${className}`}>Preview unavailable</div>
  }
  if (!src) {
    return <div className={`animate-pulse bg-slate-200 ${className}`} />
  }
  return <img src={src} alt={alt} className={className} />
}
