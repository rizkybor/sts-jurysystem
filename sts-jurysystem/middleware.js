import { withAuth } from 'next-auth/middleware';

// pages.signIn di sini cuma dipakai buat tujuan redirect middleware (belum
// login -> lempar ke homepage), bukan mengubah alur signIn() NextAuth secara
// global (authOptions.js sengaja tidak diubah).
export default withAuth({
  pages: {
    signIn: '/',
  },
});

export const config = {
  matcher: [
    '/properties/add',
    '/profile',
    '/properties/saved',
    '/messages',
    '/judges',
    '/judges/:path*',
    '/histories',
  ],
};