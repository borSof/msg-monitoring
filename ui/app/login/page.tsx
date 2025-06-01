'use client'
import { useState, useEffect } from "react"
import { Box, Button, Input, Heading, FormControl, FormLabel, useToast, Text } from "@chakra-ui/react"
import { useRouter } from "next/navigation"
import axios from "axios"
import { useAuth } from "../providers/AuthProvider"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const toast = useToast()
  const { setToken, setRole, setUsername: setUser, setPermissions } = useAuth() as any

  // --- NEW: redirect if already logged in
  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("token")) {
      const permissions = JSON.parse(localStorage.getItem("permissions") || "[]")
      const landingPages = [
        { href: "/messages", perm: "view_messages" },
        { href: "/status", perm: "view_status" },
        { href: "/maybe", perm: "review_maybe" },
        { href: "/rules", perm: "edit_rules" },
        { href: "/fields", perm: "manage_fields" },
        { href: "/users", perm: "manage_users" }
      ]
      const firstAllowed = landingPages.find(p => permissions?.includes(p.perm));
      if (firstAllowed) router.replace(firstAllowed.href);
    }
  }, []);

  async function handleLogin(e: any) {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const res = await axios.post('/api/login', { username, password })
      if (res.data.token) {
        localStorage.setItem("token", res.data.token)
        localStorage.setItem("role", res.data.role)
        localStorage.setItem("username", res.data.username)
        localStorage.setItem("permissions", JSON.stringify(res.data.permissions || []))
        setToken(res.data.token)
        setRole(res.data.role)
        setUser(res.data.username)
        setPermissions(res.data.permissions || [])
        toast({ title: "Login success", status: "success" })
        const landingPages = [
          { href: "/messages", perm: "view_messages" },
          { href: "/status", perm: "view_status" },
          { href: "/maybe", perm: "review_maybe" },
          { href: "/rules", perm: "edit_rules" },
          { href: "/fields", perm: "manage_fields" },
          { href: "/users", perm: "manage_users" }
        ];
        const firstAllowed = landingPages.find(p => res.data.permissions?.includes(p.perm));
        if (firstAllowed) {
          router.push(firstAllowed.href);
        } else {
          setError("Нямате достъп до нито една страница.");
        }
      }
    } catch (e: any) {
      setError(e.response?.data?.error || "Login error")
    }
    setLoading(false)
  }

  return (
    <Box maxW="sm" mx="auto" mt={16} p={6} borderWidth="1px" borderRadius="xl">
      <Heading size="md" mb={6}>Login</Heading>
      <form onSubmit={handleLogin}>
        <FormControl mb={4}>
          <FormLabel>Username</FormLabel>
          <Input value={username} onChange={e => setUsername(e.target.value)} />
        </FormControl>
        <FormControl mb={4}>
          <FormLabel>Password</FormLabel>
          <Input type="password" value={password} onChange={e => setPassword(e.target.value)} />
        </FormControl>
        {error && <Text color="red.500" mb={3}>{error}</Text>}
        <Button type="submit" colorScheme="blue" isLoading={loading} w="full">Login</Button>
      </form>
    </Box>
  )
}
