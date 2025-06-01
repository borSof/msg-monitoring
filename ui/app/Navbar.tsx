'use client'

import { useAuth } from "./providers/AuthProvider"
import { Box, Flex, Link, Heading, Spacer, useColorModeValue, Button } from "@chakra-ui/react"
import NextLink from 'next/link'

const PAGES = [
  { href: "/messages", label: "Messages", permission: "view_messages" },
  { href: "/rules", label: "Rules", permission: "edit_rules" },
  { href: "/maybe", label: "Maybe", permission: "review_maybe" },
  { href: "/fields", label: "Fields", permission: "manage_fields" },
  { href: "/status", label: "Status", permission: "view_status" },
  { href: "/users", label: "Users", permission: "manage_users" },
  { href: "/roles", label: "Roles", permission: "manage_roles" }
]

export function Navbar() {
  const bg = useColorModeValue('gray.100', 'gray.900')
  const color = useColorModeValue('gray.800', 'gray.200')

  // Просто взимаш контекста (ако не е дефиниран, ще върне undefined, няма да крашне)
  const auth = useAuth() as any || {}
  const permissions: string[] = auth.permissions ?? []
  const token: string | null = auth.token ?? null
  const username: string | null = auth.username ?? null
  const setToken = auth.setToken
  const setRole = auth.setRole
  const setUser = auth.setUsername
  const setPermissions = auth.setPermissions

  function handleLogout() {
    localStorage.clear()
    if (setToken) setToken(null)
    if (setRole) setRole(null)
    if (setUser) setUser(null)
    if (setPermissions) setPermissions([])
    window.location.href = "/login"
  }

  return (
    <Box bg={bg} px={6} py={3} boxShadow="sm" mb={4}>
      <Flex align="center">
        <Heading size="md" color={color}>
          MSG Monitoring
        </Heading>
        <Spacer />
        <Flex gap={4} align="center">
          {token ? (
            <>
              {PAGES.filter(p => permissions?.includes(p.permission)).map(p =>
                <Link
                  as={NextLink}
                  key={p.href}
                  href={p.href}
                  color={color}
                  fontWeight="medium"
                  _hover={{ textDecoration: "underline", color: "blue.500" }}
                >
                  {p.label}
                </Link>
              )}
              <span style={{ color, fontWeight: "bold", marginLeft: "1.5rem" }}>
                {username}
              </span>
              <Button
                ml={2}
                size="sm"
                colorScheme="red"
                variant="outline"
                onClick={handleLogout}
              >
                Logout
              </Button>
            </>
          ) : (
            <Link
              as={NextLink}
              href="/login"
              color={color}
              fontWeight="medium"
              _hover={{ textDecoration: "underline", color: "blue.500" }}
            >
              Login
            </Link>
          )}
        </Flex>
      </Flex>
    </Box>
  )
}
