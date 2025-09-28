// app/layout.jsx (server component, TIDAK perlu "use client")
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AuthProvider from '@/components/AuthProvider';
import { ToastContainer } from 'react-toastify';
import { GlobalProvider } from '@/context/GlobalContext';
import '@/assets/styles/global.css';
import 'react-toastify/dist/ReactToastify.css';
import 'photoswipe/dist/photoswipe.css';

export const metadata = {
  title: 'Sustainable Timing | Professional Timing System',
  description: 'Get professional timing for your events',
  keywords: 'timing system, find timing system, find events',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        {/* Providers sebaiknya di dalam body */}
        <GlobalProvider>
          <AuthProvider>
            <Navbar />

            {/* Jika Navbar fixed/top-0, tambahkan pt sesuai tinggi navbar, misal: pt-16 */}
            <main className="flex-1">
              {children}
            </main>

            <Footer />
            <ToastContainer />
          </AuthProvider>
        </GlobalProvider>
      </body>
    </html>
  );
}