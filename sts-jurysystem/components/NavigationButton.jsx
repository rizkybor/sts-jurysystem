import Link from 'next/link'

const NavigationButton = ({
  href,
  label,
  color,
  params = {},
  className = '',
}) => {
  const queryString = new URLSearchParams(params).toString()
  const fullHref = queryString ? `${href}?${queryString}` : href

  return (
    <Link href={fullHref} className='w-full'>
      <button
        className={`w-full flex items-center justify-center gap-2 px-6 py-3 
          rounded-lg text-white font-medium shadow-md 
          bg-gradient-to-r ${color} 
          hover:opacity-90 hover:scale-105 transition-all duration-200 
          ${className}`}>
        <span className='text-sm md:text-base'>{label}</span>
      </button>
    </Link>
  )
}

export default NavigationButton
