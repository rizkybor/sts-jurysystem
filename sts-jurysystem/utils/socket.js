// app/lib/socket.js
import { io } from 'socket.io-client'

// Di production selalu pakai broker yang di-deploy (NEXT_PUBLIC_RT_URL).
// Di dev, pakai broker lokal (NEXT_PUBLIC_RT_URL_DEV, default localhost:4000)
// supaya bisa dites bareng sts-timingsystem & sts-racehub yang jalan lokal,
// tanpa bergantung pada broker production yang mungkin sedang down/suspended.
const BROKER_URL =
  process.env.NODE_ENV === 'production'
    ? process.env.NEXT_PUBLIC_RT_URL
    : process.env.NEXT_PUBLIC_RT_URL_DEV || 'http://localhost:4000'

let socket

export default function getSocket() {
  if (!socket) {
    // Auth opsional: localStorage hanya tersedia di browser
    let token
    if (typeof window !== 'undefined') token = localStorage.getItem('authToken')
    socket = io(BROKER_URL, { auth: { token } })
    socket.on('connect', () =>
      console.log('[Next] socket connected:', socket.id)
    )
    socket.on('disconnect', () => console.log('[Next] socket disconnected'))
  }
  return socket
}
