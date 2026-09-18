import connectDB from '@/config/database';
import User from '@/models/User';

import GoogleProvider from 'next-auth/providers/google';

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),
  ],
  callbacks: {
    // Invoked on successful signin
    async signIn({ profile }) {
      // 1. Connect to database
      await connectDB();
      // 2. Check if user exists
      const userExists = await User.findOne({ email: profile.email });
      // 3. If not, then add user to database
      if (!userExists) {
        // Truncate user name if too long
        const username = profile.name.slice(0, 20);

        await User.create({
          email: profile.email,
          username,
          image: profile.picture,
        });
      }
      // 4. Return true to allow sign in
      return true;
    },
    // Modifies the session object — dipanggil NextAuth core di SETIAP
    // request ke /api/auth/session, termasuk polling background
    // (AuthProvider.jsx, refetchInterval 60 detik). Kalau callback ini
    // throw, next-auth core (routes/session.js) menangkapnya dgn
    // MENGHAPUS cookie session & mengirim body kosong — client
    // (useSession) langsung baca itu sbg status "unauthenticated", lalu
    // RequireAuth redirect ke Home. Itu penyebab bug "judges suka logout
    // sendiri tiba-tiba, tapi refresh muncul lagi akunnya" — BUKAN logout
    // asli, tapi callback ini gagal sesaat (koneksi Mongo belum siap /
    // race) lalu next-auth SALAH mengira user benar-benar tidak login.
    // Fix: connectDB() eksplisit (jangan andalkan koneksi sudah dibuka
    // route lain) + null-guard (JANGAN throw kalau user tidak ketemu).
    async session({ session }) {
      try {
        await connectDB();
        const user = await User.findOne({ email: session.user.email });
        if (user) {
          session.user.id = user._id.toString();
        }
      } catch (err) {
        console.error("❌ [authOptions.session] gagal ambil user:", err?.message);
      }
      return session;
    },
  },
};