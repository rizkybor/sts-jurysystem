// components/InfoBox.js

import Link from 'next/link'

const InfoBox = ({
  heading,
  backgroundColor = 'bg-gray-100',
  textColor = 'text-gray-800',
  buttonInfo,
  children,
}) => {
  const {
    text,
    link,
    backgroundColor: buttonBgColor,
    onClick,
    target,
  } = buttonInfo

  return (
    <div className={`${backgroundColor} p-6 rounded-lg shadow-md`}>
      <h2 className={`${textColor} text-2xl font-bold`}>{heading}</h2>
      <p className={`${textColor} mt-2 mb-4`}>{children}</p>

      {/* Kondisi untuk menentukan apakah menggunakan Link, <a>, atau <button> */}
      {link ? (
        // Menggunakan <Link> jika properti 'link' ada
        <Link
          href={link}
          className={`inline-block ${buttonBgColor} text-white rounded-lg px-4 py-2 hover:opacity-80`}
          target={target}>
          {text}
        </Link>
      ) : (
        // Menggunakan <button> jika properti 'onClick' ada
        <button
          onClick={onClick}
          className={`inline-block ${buttonBgColor} text-white rounded-lg px-4 py-2 hover:opacity-80`}>
          {text}
        </button>
      )}
    </div>
  )
}

export default InfoBox
