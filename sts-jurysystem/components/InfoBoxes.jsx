'use client'
import { useState, useEffect } from 'react'
import { signIn, useSession, getProviders } from 'next-auth/react'
import InfoBox from './InfoBox' // Gunakan InfoBox yang fleksibel

const InfoBoxes = () => {
  const { data: session } = useSession() // Mendapatkan data sesi pengguna
  const [providers, setProviders] = useState(null)

  useEffect(() => {
    const setAuthProviders = async () => {
      const res = await getProviders()
      setProviders(res)
    }
    setAuthProviders()
  }, [])

  const handleRegisterClick = () => {
    // Jika pengguna belum login
    if (!session) {
      if (providers) {
        // Panggil fungsi signIn dari NextAuth
        const googleProvider = Object.values(providers)[0]
        signIn(googleProvider.id)
      }
    } else {
      // Jika pengguna sudah login, arahkan ke halaman juri
      window.location.href = '/judges'
    }
  }

  return (
    <section>
      <div className='container-xl lg:container m-auto'>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg'>
          <InfoBox
            heading='All Events by Sustainable'
            backgroundColor="bg-gray-50"
            buttonInfo={{
              text: 'All Events',
              link: '/matches',
              backgroundColor: 'surface-sts',
            }}>
            Find all match results from sustainable timings.
          </InfoBox>

          <InfoBox
            heading='Jury Register'
            backgroundColor="bg-gray-50"
            buttonInfo={{
              // Teks tombol akan berubah berdasarkan status sesi pengguna
              text: session ? 'Register Now' : 'Login or Register',
              // Menggunakan fungsi onClick untuk menangani logika
              onClick: handleRegisterClick,
              backgroundColor: 'surface-sts',
            }}>
            Register as a jury in an activity.
          </InfoBox>
        </div>
      </div>
    </section>
  )
}

export default InfoBoxes
