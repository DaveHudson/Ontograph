"use client"

import Image, { type ImageProps } from "next/image"
import { useEffect, useState } from "react"

interface ThemeImageProps extends Omit<ImageProps, "src"> {
  srcLight: string
  srcDark: string
}

export function ThemeImage({ srcLight, srcDark, ...props }: ThemeImageProps) {
  const [isDark, setIsDark] = useState<boolean | null>(null)

  useEffect(() => {
    const update = () =>
      setIsDark(document.documentElement.classList.contains("dark"))

    update()

    const observer = new MutationObserver(update)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })
    return () => observer.disconnect()
  }, [])

  // Avoid rendering during SSR / hydration to prevent loading the wrong variant
  if (isDark === null) return null

  return <Image src={isDark ? srcDark : srcLight} {...props} />
}
