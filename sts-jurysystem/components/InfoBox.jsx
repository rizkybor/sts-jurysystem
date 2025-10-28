// components/InfoBox.js
import Link from 'next/link'
import React from 'react'

const baseBtn =
  'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2'
const sizeMap = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
}
const variantMap = {
  solid: (bg = 'surface-sts') => `${bg} text-white hover:btnHover-sts`,
  outline: (color = 'sts') =>
    `border border-${color} text-${color} hover:bg-${color}/10`,
  ghost: (color = 'sts') => `text-${color} hover:bg-${color}/10`,
}

/** Normalisasi: terima object atau array */
function normalizeButtons(buttonInfo) {
  if (!buttonInfo) return []
  return Array.isArray(buttonInfo) ? buttonInfo : [buttonInfo]
}

const InfoBox = ({
  heading,
  backgroundColor = 'bg-white',
  textColor = 'text-gray-800',
  buttonInfo,
  children,
  className = '',
  contentClassName = '',
  buttonsClassName = '', // container tombol
}) => {
  const isPlainText = typeof children === 'string' || typeof children === 'number'
  const buttons = normalizeButtons(buttonInfo)

  return (
    <div className={`${backgroundColor} p-6 rounded-lg shadow-md ${className}`}>
      {heading ? <h2 className={`${textColor} text-2xl font-bold`}>{heading}</h2> : null}

      <div className={`${isPlainText ? '' : 'mt-2'} ${contentClassName}`}>
        {isPlainText ? (
          <p className={`${textColor} mt-2 mb-4`}>{children}</p>
        ) : (
          <div className={`${textColor} mt-2 mb-4`}>{children}</div>
        )}
      </div>

      {/* Tombol: support single atau multiple */}
      {buttons.length > 0 ? (
        <div className={`flex flex-wrap items-center gap-2 ${buttonsClassName}`}>
          {buttons.map((btn, i) => {
            const {
              text,
              link,
              onClick,
              target,
              rel,
              disabled = false,
              backgroundColor: buttonBgColor = 'surface-sts',
              variant = 'solid', // 'solid' | 'outline' | 'ghost'
              size = 'md', // 'sm' | 'md' | 'lg'
              className: btnClass = '',
            } = btn || {}

            const sizeCls = sizeMap[size] || sizeMap.md
            const styleFn = variantMap[variant] || variantMap.solid
            const variantCls = styleFn(
              variant === 'solid' ? buttonBgColor : 'sts'
            )

            const classes = [
              baseBtn,
              sizeCls,
              variantCls,
              disabled ? 'opacity-60 pointer-events-none cursor-not-allowed' : '',
              btnClass,
            ]
              .filter(Boolean)
              .join(' ')

            return link ? (
              <Link
                key={i}
                href={disabled ? '#' : link}
                className={classes}
                target={target}
                rel={rel}
              >
                {text}
              </Link>
            ) : (
              <button
                key={i}
                type="button"
                onClick={disabled ? undefined : onClick}
                disabled={disabled}
                className={classes}
              >
                {text}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

export default InfoBox