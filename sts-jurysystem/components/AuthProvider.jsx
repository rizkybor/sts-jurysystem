'use client';
import { SessionProvider } from 'next-auth/react';

const AuthProvider = ({ children }) => {
  // refetchInterval: cek ulang sesi tiap 60 detik supaya sesi yang tiba-tiba
  // tidak valid lagi (mis. logout di tab lain) cepat terdeteksi walau tab
  // ini tetap fokus/tidak pernah pindah window.
  return <SessionProvider refetchInterval={60}>{children}</SessionProvider>;
};
export default AuthProvider;