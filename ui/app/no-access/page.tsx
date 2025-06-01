'use client'
import { Box, Heading, Text, Button } from "@chakra-ui/react"
import { useRouter } from "next/navigation"

export default function NoAccessPage() {
  const router = useRouter()
  return (
    <Box maxW="sm" mx="auto" mt={16} p={6} borderWidth="1px" borderRadius="xl" textAlign="center">
      <Heading size="md" mb={4}>Нямате достъп</Heading>
      <Text mb={4}>Нямате нужните права, за да достъпите тази страница.</Text>
      <Button colorScheme="blue" onClick={() => router.push("/login")}>Към Login</Button>
    </Box>
  )
}
