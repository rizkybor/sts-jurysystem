import Image from 'next/image';
import logo from '@/assets/images/logo-white.png';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-blue-700 bottom-0 left-0 w-full py-4">
  <div className="container mx-auto flex flex-col md:flex-row items-center justify-between px-4">
    <div className="mb-4 md:mb-0">
      <Image src={logo} alt="Logo" className="h-8 w-auto" />
    </div>
    <p className="text-sm mt-2 md:mt-0 text-white">
      &copy;{new Date().getFullYear()} Sustainable Timing System by Jendela Kode
    </p>
  </div>
</footer>
  );
};
export default Footer;