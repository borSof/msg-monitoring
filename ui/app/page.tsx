'use client'
import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function Home() {
  const router = useRouter()
  useEffect(() => {
    // Може да валидираш тук, но най-просто:
    router.replace("/login")  // или към друга дефолтна страница
  }, [router])

  return null
}
