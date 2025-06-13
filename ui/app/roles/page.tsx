'use client'

import { useEffect, useState } from "react"
import {
  Box, Heading, Input, Button, Flex, Text, Badge, IconButton, List, ListItem, useToast, Spinner
} from "@chakra-ui/react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "../api"
import { FaTrash, FaPlus } from "react-icons/fa"
import { useAuth } from "../providers/AuthProvider"
import { useRouter } from "next/navigation"

export default function RolesPage() {
  const { token, permissions } = useAuth() as any
  const router = useRouter()
  const toast = useToast()
  const queryClient = useQueryClient()

  // Guard за достъп (само управлява визуализация)
  const [checked, setChecked] = useState(false)
  useEffect(() => {
    if (!token) {
      router.replace("/login")
    } else if (!permissions?.includes("manage_roles")) {
      router.replace("/no-access")
    } else {
      setChecked(true)
    }
  }, [token, permissions, router])

  // useQuery трябва да се ИЗВИКВА ВИНАГИ, но да се "disable"-не, ако не е минал guard-а!
  const { data: roles, isLoading } = useQuery<any[]>({
    queryKey: ['roles'],
    queryFn: () => api.get('/api/roles').then(r => r.data),
    staleTime: 10_000,
    enabled: checked, // заявка само ако е минал guard-а
  })

  const [roleName, setRoleName] = useState("")
  const [permInput, setPermInput] = useState("")
  const [editId, setEditId] = useState<string | null>(null)
  const [editPerms, setEditPerms] = useState<string[]>([])

  const saveRole = useMutation({
    mutationFn: (data: { name: string, permissions: string[] }) =>
      editId
        ? api.put('/api/roles/' + editId, data)
        : api.post('/api/roles', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      setEditId(null)
      setEditPerms([])
      setRoleName("")
      toast({ title: "Role saved", status: "success" })
    }
  })

  const deleteRole = useMutation({
    mutationFn: (id: string) => api.delete('/api/roles/' + id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      toast({ title: "Role deleted", status: "info" })
    }
  })

  function handleEdit(role: any) {
    setEditId(role._id)
    setRoleName(role.name)
    setEditPerms([...role.permissions])
  }

  // --- Guard spinner (след hooks)
  if (!checked) return <Box p={8}><Spinner size="xl" /></Box>

  return (
    <Box maxW="3xl" mx="auto" p={8}>
      <Heading size="lg" mb={6}>Roles & Permissions</Heading>
      {/* New/Edit role form */}
      <Box mb={8} p={4} borderWidth={1} borderRadius="lg" bg="gray.50">
        <Heading size="sm" mb={3}>{editId ? "Edit Role" : "Add New Role"}</Heading>
        <Flex gap={2} mb={2}>
          <Input
            placeholder="Role name (e.g. admin)"
            value={roleName}
            onChange={e => setRoleName(e.target.value)}
            isDisabled={!!editId}
            width="200px"
          />
          <Input
            placeholder="Add permission (e.g. manage_users)"
            value={permInput}
            onChange={e => setPermInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && permInput.trim()) {
                setEditPerms(p => [...p, permInput.trim()])
                setPermInput("")
              }
            }}
            width="200px"
          />
          <Button
            leftIcon={<FaPlus />}
            onClick={() => { if (permInput.trim()) { setEditPerms(p => [...p, permInput.trim()]); setPermInput("") } }}
            size="sm"
          >Add Perm</Button>
        </Flex>
        <Flex gap={2} flexWrap="wrap" mb={2}>
          {editPerms.map(perm =>
            <Badge key={perm} colorScheme="blue" px={2} py={1} borderRadius="md" mr={1}>
              {perm}
              <IconButton
                aria-label="Remove"
                icon={<FaTrash />}
                ml={2}
                size="xs"
                colorScheme="red"
                variant="ghost"
                onClick={() => setEditPerms(editPerms.filter(p => p !== perm))}
              />
            </Badge>
          )}
        </Flex>
        <Flex gap={2}>
          <Button
            colorScheme="green"
            size="sm"
            onClick={() => saveRole.mutate({ name: roleName, permissions: editPerms })}
            isLoading={saveRole.isPending}
          >
            {editId ? "Save" : "Create"}
          </Button>
          {editId && <Button size="sm" onClick={() => { setEditId(null); setEditPerms([]); setRoleName(""); }}>Cancel</Button>}
        </Flex>
      </Box>
      {/* Roles list */}
      {isLoading ? (
        <Text>Loading...</Text>
      ) : (
        <List spacing={5}>
          {roles?.map(role => (
            <ListItem key={role._id} borderWidth={1} borderRadius="md" p={4} mb={2}>
              <Flex align="center" justify="space-between">
                <Flex gap={2} align="center">
                  <Text fontWeight="bold" fontSize="lg">{role.name}</Text>
                  {role.permissions?.map((p: string) => (
                    <Badge key={p} colorScheme="blue" mx={1}>{p}</Badge>
                  ))}
                </Flex>
                <Flex gap={2}>
                  <Button size="xs" colorScheme="blue" onClick={() => handleEdit(role)}>Edit</Button>
                  <Button size="xs" colorScheme="red" onClick={() => deleteRole.mutate(role._id)}>Delete</Button>
                </Flex>
              </Flex>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  )
}
