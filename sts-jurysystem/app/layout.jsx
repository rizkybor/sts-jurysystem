// app/layout.jsx (server component, TIDAK perlu "use client")
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AuthProvider from '@/components/AuthProvider';
import { ToastContainer } from 'react-toastify';
import { GlobalProvider } from '@/context/GlobalContext';
import '@/assets/styles/global.css';
import 'react-toastify/dist/ReactToastify.css';
import 'photoswipe/dist/photoswipe.css';


const COMPANY_NAME = 'PT. Jendela Cakra Digital';
const COMPANY_URL = 'https://jcdigital.co.id/';

export const metadata = {
  // Penting untuk OpenGraph & Twitter Card
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),

  title: {
    default: 'STiming Scoring | Smart & Accurate Event Timing System',
    template: '%s | STiming Scoring',
  },
  description:
    'Sustainable Timing Scoring menyediakan solusi sistem pencatatan waktu profesional untuk perlombaan dan event olahraga. Akurat, real-time, dan dapat disesuaikan dengan kebutuhan setiap kompetisi.',
  keywords:
    'timing system, race timing, event timing, sports timing, stopwatch system, smart timing, professional timing service, event management, race results, live timing, rafting, pecinta alam, race, pertandingan, championship',

  authors: [{ name: COMPANY_NAME, url: COMPANY_URL }],
  creator: COMPANY_NAME,
  publisher: COMPANY_NAME,

  // Ikon dari folder public/assets/icon
  icons: {
    icon: [
      { url: '/assets/icon/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/assets/icon/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/assets/icon/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/assets/icon/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/assets/icon/favicon-32x32.png',
    apple: '/assets/icon/apple-touch-icon.png',
    other: [
      {
        rel: 'msapplication-TileImage',
        url: '/assets/icon/ms-icon-144x144.png',
      },
    ],
  },

  // OpenGraph untuk share di Facebook, LinkedIn, dsb.
  openGraph: {
    title: 'STiming Scoring | Smart & Accurate Event Timing System',
    description:
      'Solusi profesional untuk pencatatan waktu event dan perlombaan. Akurat, efisien, dan berkelanjutan.',
    url: '/',
    siteName: 'STiming Scoring',
    images: [
      {
        url: '/assets/icon/og-image.jpg', // pastikan file ini ada di public/assets/icon/
        width: 1200,
        height: 630,
        alt: 'STiming Scoring',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },

  // Metadata untuk Twitter Card
  twitter: {
    card: 'summary_large_image',
    title: 'STiming Scoring | Professional Event Timing System',
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

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'STiming Scoring',
  description:
    'Platform timing dan penjurian untuk event Whitewater Rafting Championship — akurat, transparan, real-time.',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  publisher: {
    '@type': 'Organization',
    name: COMPANY_NAME,
    url: COMPANY_URL,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        {/* JSON-LD: sinyal terstruktur untuk mesin pencari, sekaligus
            mencantumkan atribusi/backlink resmi ke PT. Jendela Cakra Digital */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
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