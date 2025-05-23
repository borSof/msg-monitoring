'use client'

import { ChakraProvider } from "@chakra-ui/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactNode, useState } from "react"

export function Providers({ children }: { children: ReactNode }) {
  // Един QueryClient за целия app (useState -> иначе ще се създава нов на всяко рендериране)
  const [queryClient] = useState(() => new QueryClient())

  return (
    <ChakraProvider>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </ChakraProvider>
  )
}
