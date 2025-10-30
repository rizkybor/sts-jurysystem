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
  // Penting untuk OpenGraph & Twitter Card
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),

  title: 'Sustainable Timing | Smart & Accurate Event Timing System',
  description:
    'Sustainable Timing menyediakan solusi sistem pencatatan waktu profesional untuk perlombaan dan event olahraga. Akurat, real-time, dan dapat disesuaikan dengan kebutuhan setiap kompetisi.',
  keywords:
    'timing system, race timing, event timing, sports timing, stopwatch system, smart timing, professional timing service, event management, race results, live timing, rafting, pecinta alam, race, pertandingan, championship',

  authors: [{ name: 'Sustainable Timing Team' }],

  // Ikon dari folder public/assets/icon
  icons: {
    icon: '/assets/icon/favicon-32x32.png',
    shortcut: '/assets/icon/favicon-96x96.png',
    apple: '/assets/icon/apple-icon.png',
    other: [
      {
        rel: 'android-chrome',
        url: '/assets/icon/android-icon-192x192.png',
      },
      {
        rel: 'msapplication-TileImage',
        url: '/assets/icon/ms-icon-144x144.png',
      },
    ],
  },

  // OpenGraph untuk share di Facebook, LinkedIn, dsb.
  openGraph: {
    title: 'Sustainable Timing | Smart & Accurate Event Timing System',
    description:
      'Solusi profesional untuk pencatatan waktu event dan perlombaan. Akurat, efisien, dan berkelanjutan.',
    url: '/',
    siteName: 'Sustainable Timing',
    images: [
      {
        url: '/assets/icon/og-image.jpg', // pastikan file ini ada di public/assets/icon/
        width: 1200,
        height: 630,
        alt: 'Sustainable Timing System',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },

  // Metadata untuk Twitter Card
  twitter: {
    card: 'summary_large_image',
    title: 'Sustainable Timing | Professional Event Timing System',
    description:
      'Akurat, real-time, dan ramah lingkungan — solusi terbaik untuk sistem pencatatan waktu event Anda.',
    images: ['/assets/icon/og-image.jpg'],
    creator: '@sustainabletiming',
  },

  // Robot directives
  robots: {
    index: true,
    follow: true,
  },

  // Canonical URL
  alternates: {
    canonical: '/',
  },

  // Manifest optional (kalau kamu punya)
  manifest: '/assets/icon/manifest.json',
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