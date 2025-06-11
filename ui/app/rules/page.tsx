'use client'

import { useAuth } from "../providers/AuthProvider"
import {
  Box, Heading, Table, Thead, Tbody, Tr, Th, Td,
  Button, FormControl, FormLabel, Input, Select, Flex, Spinner, useToast, IconButton
} from '@chakra-ui/react'
import { AddIcon, DeleteIcon } from '@chakra-ui/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useState, useEffect } from 'react'
import { useRouter } from "next/navigation"

interface Condition {
  field: string
  operator: string
  value: string
}

interface Rule {
  _id: string
  name: string
  logic: string
  conditions: Condition[]
  action: string
  priority: number
  tag?: string
}

const OPERATORS = ['contains', 'not contains', 'equals', 'regex', 'gt', 'lt']
const ACTIONS = ['Allowed', 'Forbidden', 'Tag', 'Maybe']
const LOGICS = ['AND', 'OR']

export default function RulesPage() {
  const { token, permissions } = useAuth() as any
  const router = useRouter()
  const queryClient = useQueryClient()
  const toast = useToast()

  const [checked, setChecked] = useState(false)
  useEffect(() => {
    if (!token) {
      router.replace("/login")
    } else if (!permissions?.includes("edit_rules")) {
      router.replace("/no-access")
    } else {
      setChecked(true)
    }
  }, [token, permissions, router])

  const { data: rules, isLoading } = useQuery<Rule[]>({
    queryKey: ['rules'],
    queryFn: () => axios.get('/api/rules').then(res => res.data),
    enabled: checked
  })

  const [form, setForm] = useState<Partial<Rule>>({
    name: '', logic: 'AND', action: 'Allowed', priority: 1, tag: '', conditions: [{ field: '', operator: 'contains', value: '' }]
  })

  const createMutation = useMutation({
    mutationFn: (newRule: Partial<Rule>) => axios.post('/api/rules', newRule),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rules'] })
      toast({ title: 'Rule added!', status: 'success', duration: 1500 })
      setForm({ name: '', logic: 'AND', action: 'Allowed', priority: 1, tag: '', conditions: [{ field: '', operator: 'contains', value: '' }] })
    },
    onError: (err: any) => toast({ title: err.response?.data?.error || 'Error!', status: 'error' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => axios.delete(`/api/rules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rules'] })
      toast({ title: 'Rule deleted!', status: 'info', duration: 1200 })
    }
  })

  const updateCondition = (index: number, field: keyof Condition, value: string) => {
    const updated = [...(form.conditions || [])]
    updated[index][field] = value
    setForm(f => ({ ...f, conditions: updated }))
  }

  const addCondition = () => {
    setForm(f => ({ ...f, conditions: [...(f.conditions || []), { field: '', operator: 'contains', value: '' }] }))
  }

  const removeCondition = (index: number) => {
    const updated = [...(form.conditions || [])]
    updated.splice(index, 1)
    setForm(f => ({ ...f, conditions: updated }))
  }

  if (!checked) {
    return <Flex justify="center" p={10}><Spinner size="xl" /></Flex>
  }

  return (
    <Box maxW="6xl" mx="auto" p={8}>
      <Heading size="lg" mb={6}>Rules</Heading>
      <Box as="form"
        mb={8}
        p={4}
        border="1px"
        borderColor="gray.200"
        borderRadius="md"
        bg="gray.50"
onSubmit={(e: React.FormEvent) => {
  e.preventDefault()
  createMutation.mutate(form)
}}
      >
        <Flex gap={4} flexWrap="wrap" mb={4}>
          <FormControl isRequired>
            <FormLabel>Name</FormLabel>
            <Input value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </FormControl>
          <FormControl isRequired>
            <FormLabel>Action</FormLabel>
            <Select value={form.action} onChange={e => setForm(f => ({ ...f, action: e.target.value }))}>
              {ACTIONS.map(a => <option key={a}>{a}</option>)}
            </Select>
          </FormControl>
          {form.action === 'Tag' && (
            <FormControl>
              <FormLabel>Tag (optional)</FormLabel>
              <Input value={form.tag || ''} onChange={e => setForm(f => ({ ...f, tag: e.target.value }))} />
            </FormControl>
          )}
          <FormControl isRequired>
            <FormLabel>Logic</FormLabel>
            <Select value={form.logic} onChange={e => setForm(f => ({ ...f, logic: e.target.value }))}>
              {LOGICS.map(l => <option key={l}>{l}</option>)}
            </Select>
          </FormControl>
          <FormControl isRequired>
            <FormLabel>Priority</FormLabel>
            <Input type="number" min={1} value={form.priority || 1} onChange={e => setForm(f => ({ ...f, priority: Number(e.target.value) }))} />
          </FormControl>
        </Flex>

        {form.conditions?.map((cond, idx) => (
          <Flex key={idx} gap={4} align="end" mb={3}>
            <FormControl isRequired>
              <FormLabel>Field</FormLabel>
              <Input value={cond.field} onChange={e => updateCondition(idx, 'field', e.target.value)} />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Operator</FormLabel>
              <Select value={cond.operator} onChange={e => updateCondition(idx, 'operator', e.target.value)}>
                {OPERATORS.map(op => <option key={op}>{op}</option>)}
              </Select>
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Value</FormLabel>
              <Input value={cond.value} onChange={e => updateCondition(idx, 'value', e.target.value)} />
            </FormControl>
            <IconButton aria-label="Remove condition" icon={<DeleteIcon />} onClick={() => removeCondition(idx)} />
          </Flex>
        ))}

        <Button onClick={addCondition} leftIcon={<AddIcon />} mb={4}>Add Condition</Button>
        <Button type="submit" colorScheme="blue" isLoading={createMutation.isPending}>Add Rule</Button>
      </Box>

      {isLoading ? (
        <Flex justify="center" p={10}><Spinner /></Flex>
      ) : (
        <Table size="sm" bg="white" borderRadius="lg" boxShadow="md">
          <Thead bg="gray.200">
            <Tr>
              <Th>Name</Th>
              <Th>Logic</Th>
              <Th>Conditions</Th>
              <Th>Action</Th>
              <Th>Priority</Th>
              <Th>Tag</Th>
              <Th>Delete</Th>
            </Tr>
          </Thead>
          <Tbody>
            {rules?.map(rule => (
              <Tr key={rule._id}>
                <Td>{rule.name}</Td>
                <Td>{rule.logic}</Td>
                <Td>
                  <ul>
                    {rule.conditions.map((c, i) => (
                      <li key={i}><strong>{c.field}</strong> {c.operator} <em>{c.value}</em></li>
                    ))}
                  </ul>
                </Td>
                <Td>{rule.action}</Td>
                <Td>{rule.priority}</Td>
                <Td>{rule.tag || '-'}</Td>
                <Td>
                  <Button size="xs" colorScheme="red" onClick={() => deleteMutation.mutate(rule._id)}>
                    Delete
                  </Button>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </Box>
  )
}
