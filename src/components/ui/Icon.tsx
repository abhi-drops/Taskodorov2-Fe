import type { ImgHTMLAttributes } from 'react'

interface IconProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt' | 'width' | 'height'> {
  src: string
  alt: string
  size?: number
}

export function Icon({ src, alt, size = 20, className = '', style, ...rest }: IconProps) {
  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={`inline-block shrink-0 object-contain ${className}`}
      style={{ width: size, height: size, ...style }}
      {...rest}
    />
  )
}
