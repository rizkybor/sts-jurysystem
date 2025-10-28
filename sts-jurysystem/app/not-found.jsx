import Link from 'next/link'
import { FaExclamationTriangle } from 'react-icons/fa'

const NotFoundPage = () => {
  return (
    <section className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-[#1874A5] via-[#4690B7] to-[#1558B0] text-white px-6">
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-10 shadow-xl border border-white/20 max-w-lg w-full text-center">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <FaExclamationTriangle className="text-7xl text-yellow-300 drop-shadow-[0_0_10px_rgba(255,215,0,0.4)] animate-pulse" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full animate-ping opacity-70"></span>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-4xl font-bold mb-3 text-white drop-shadow-sm">Page Not Found</h1>
        <p className="text-white/90 text-lg mb-8">
          The page you’re looking for doesn’t exist or may have been moved.
        </p>

        {/* Button */}
        <Link
          href="/"
          className="inline-block bg-white text-sts font-semibold py-3 px-8 rounded-lg shadow-md hover:bg-sts hover:text-white hover:shadow-[0_0_20px_rgba(70,144,183,0.4)] transition-all duration-300"
        >
          Go Home
        </Link>
      </div>

    </section>
  )
}

export default NotFoundPage