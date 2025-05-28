'use client'

import {
  Box, Heading, Table, Thead, Tbody, Tr, Th, Td,
  Button, FormControl, FormLabel, Input, Select, Flex, Spinner, useToast
} from '@chakra-ui/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useState } from 'react'

interface Rule {
  _id: string
  name: string
  field: string
  operator: string
  value: string
  action: string
  priority: number
  tag?: string
}

const OPERATORS = ['contains', 'equals', 'regex', 'gt', 'lt']
const ACTIONS = ['Allowed', 'Forbidden', 'Tag', 'Maybe'];

export default function RulesPage() {
  const queryClient = useQueryClient()
  const toast = useToast()

  // Fetch all rules
  const { data: rules, isLoading } = useQuery<Rule[]>({
    queryKey: ['rules'],
    queryFn: () => axios.get('/api/rules').then(res => res.data),
  })

  // State for new rule form
  const [form, setForm] = useState<Partial<Rule>>({
    name: '', field: '', operator: 'contains', value: '', action: 'Allowed', priority: 1, tag: ''
  })

  // Create rule
  const createMutation = useMutation({
    mutationFn: (newRule: Partial<Rule>) => axios.post('/api/rules', newRule),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rules'] })
      toast({ title: 'Rule added!', status: 'success', duration: 1500 })
      setForm({ name: '', field: '', operator: 'contains', value: '', action: 'Allowed', priority: 1, tag: '' })
    },
    onError: (err: any) => toast({ title: err.response?.data?.error || 'Error!', status: 'error' }),
  })

  // Delete rule
  const deleteMutation = useMutation({
    mutationFn: (id: string) => axios.delete(`/api/rules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rules'] })
      toast({ title: 'Rule deleted!', status: 'info', duration: 1200 })
    }
  })

  return (
    <Box maxW="4xl" mx="auto" p={8}>
      <Heading size="lg" mb={6}>Rules</Heading>
      <Box as="form"
        mb={8}
        p={4}
        border="1px"
        borderColor="gray.200"
        borderRadius="md"
        bg="gray.50"
        onSubmit={e => {
          e.preventDefault()
          createMutation.mutate(form)
        }}
      >
 <Flex gap={4} flexWrap="wrap">
          <FormControl isRequired>
            <FormLabel>Name</FormLabel>
            <Input value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </FormControl>
          <FormControl isRequired>
            <FormLabel>Field</FormLabel>
            <Input value={form.field || ''} onChange={e => setForm(f => ({ ...f, field: e.target.value }))} />
          </FormControl>
          <FormControl isRequired>
            <FormLabel>Operator</FormLabel>
            <Select value={form.operator} onChange={e => setForm(f => ({ ...f, operator: e.target.value }))}>
              {OPERATORS.map(op => <option key={op}>{op}</option>)}
            </Select>
          </FormControl>
          <FormControl isRequired>
            <FormLabel>Value</FormLabel>
            <Input value={form.value || ''} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} />
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
            <FormLabel>Priority</FormLabel>
            <Input type="number" min={1} value={form.priority || 1} onChange={e => setForm(f => ({ ...f, priority: Number(e.target.value) }))} />
          </FormControl>
          <Button type="submit" colorScheme="blue" mt={8} isLoading={createMutation.isPending}>Add Rule</Button>
        </Flex>
      </Box>

 {/* Rules table */}
      {isLoading ? (
        <Flex justify="center" p={10}><Spinner /></Flex>
      ) : (
        <Table size="sm" bg="white" borderRadius="lg" boxShadow="md">
          <Thead bg="gray.200">
            <Tr>
              <Th>Name</Th>
              <Th>Field</Th>
              <Th>Operator</Th>
              <Th>Value</Th>
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
                <Td>{rule.field}</Td>
                <Td>{rule.operator}</Td>
                <Td>{rule.value}</Td>
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
