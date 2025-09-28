// app/lib/socket.js
import { io } from 'socket.io-client';

const BROKER_URL =
  process.env.NODE_ENV === "production"
    ? process.env.NEXT_PUBLIC_RT_URL
    : "http://localhost:4000";

let socket;

export default function getSocket() {
  if (!socket) {
    // Auth opsional: localStorage hanya tersedia di browser
    let token;
    if (typeof window !== 'undefined') token = localStorage.getItem('authToken');
    socket = io(BROKER_URL, { auth: { token } });
    socket.on('connect', () => console.log('[Next] socket connected:', socket.id));
    socket.on('disconnect', () => console.log('[Next] socket disconnected'));
  }
  return socket;
}