import Link from "next/link";

const NavigationButton = ({ href, label, icon, color, params = {}, className = "" }) => {
  // Generate query string dari params object
  const queryString = new URLSearchParams(params).toString();
  const fullHref = queryString ? `${href}?${queryString}` : href;

  return (
    <Link href={fullHref} className="w-full">
      <button
        className={`w-full sm:w-full px-6 py-3 md:py-4 ${color} text-white rounded-lg shadow-md hover:opacity-80 transition-all duration-200 ${className}`}
      >
        <span className="text-lg md:text-xl">{icon}</span> 
        <span className="ml-2">{label}</span>
      </button>
    </Link>
  );
};

export default NavigationButton;