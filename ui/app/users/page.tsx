'use client'
import { useEffect, useState } from "react"
import { Box, Heading, Button, Flex, Text, Input, Select, Switch, Spinner } from "@chakra-ui/react"
import axios from "axios"

interface User {
  _id: string
  username: string
  role: string
  active: boolean
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [newUser, setNewUser] = useState({ username: "", password: "", role: "", active: true })

  // Зареждане на роли и потребители
  useEffect(() => {
    axios.get('/api/roles').then(res => {
      const allRoles = res.data.map((r: any) => r.name)
      setRoles(allRoles)
      setNewUser(u => ({ ...u, role: allRoles[0] || "" }))
    })
    loadUsers()
  }, [])

  // Зареди списъка с потребители
  async function loadUsers() {
    setLoading(true)
    const res = await axios.get('/api/users')
    setUsers(res.data)
    setLoading(false)
  }

  // Добави потребител
  async function addUser() {
    if (!newUser.username || !newUser.password) return alert("Въведи потребител и парола!")
    await axios.post('/api/users', newUser)
    setNewUser({ username: "", password: "", role: roles[0] || "", active: true })
    loadUsers()
  }

  // Изтрий потребител
  async function deleteUser(id: string) {
    if (!window.confirm("Сигурен ли си?")) return
    await axios.delete('/api/users/' + id)
    loadUsers()
  }

  // Смени статус/роля
  async function updateUser(u: User, key: string, value: any) {
    await axios.put('/api/users/' + u._id, { ...u, [key]: value })
    loadUsers()
  }

  return (
    <Box maxW="3xl" mx="auto" p={8}>
      <Heading size="lg" mb={4}>User Management</Heading>

      <Flex gap={2} mb={6}>
        <Input placeholder="Username" value={newUser.username} onChange={e => setNewUser(u => ({ ...u, username: e.target.value }))} />
        <Input placeholder="Password" type="password" value={newUser.password} onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))} />
        <Select value={newUser.role} onChange={e => setNewUser(u => ({ ...u, role: e.target.value }))}>
          {roles.map(role => (
            <option key={role} value={role}>{role}</option>
          ))}
        </Select>
        <Button px={4} colorScheme="blue" onClick={addUser}>Add User</Button>
      </Flex>

      {loading ? <Spinner /> : (
        users.length === 0 ? <Text color="gray.500">Няма потребители.</Text> :
        users.map(u =>
          <Flex key={u._id} align="center" borderBottom="1px solid #eee" py={2} gap={4}>
            <Text flex="1">{u.username}</Text>
            <Select value={u.role} onChange={e => updateUser(u, "role", e.target.value)} w={32}>
              {roles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </Select>
            <Switch isChecked={u.active} onChange={e => updateUser(u, "active", e.target.checked)}>Active</Switch>
            <Button size="sm" colorScheme="red" onClick={() => deleteUser(u._id)}>Delete</Button>
          </Flex>
        )
      )}
    </Box>
  )
}
