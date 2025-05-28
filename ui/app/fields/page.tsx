'use client'

import React, { useState, useEffect } from "react"
import { Box, Heading, Input, Button, Flex, Text, useToast, Spinner } from "@chakra-ui/react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import axios from "axios"

export default function FieldsPage() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const { data: visibleFields, isLoading } = useQuery<string[]>({
    queryKey: ['visibleFields'],
    queryFn: () => axios.get('/api/config/visible-fields').then(r => r.data),
  })

  const { data: allFields, isLoading: isLoadingAllFields } = useQuery<string[]>({
    queryKey: ['allMessageFields'],
    queryFn: () => axios.get('/api/messages/fields').then(r => r.data),
  })

  const [input, setInput] = useState("")
  const [fields, setFields] = useState<string[]>([])
  const [search, setSearch] = useState("")

  // Sync when data is loaded
  useEffect(() => {
    if (visibleFields) setFields(visibleFields)
  }, [visibleFields])

  const mutation = useMutation({
    mutationFn: (fields: string[]) =>
      axios.put('/api/config/visible-fields', { visibleFields: fields }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visibleFields'] })
      toast({ title: "Fields updated!", status: "success" })
    }
  })
  return (
    <Box maxW="2xl" mx="auto" p={8}>
      <Heading size="md" mb={4}>Visible Fields (Custom Fields)</Heading>

      {/* Add custom field manually */}
      <Flex gap={2} mb={4}>
        <Input
          placeholder="Add field, e.g. message.text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && input.trim()) {
            setFields(f => Array.from(new Set([...f, input.trim()])))
            setInput("")
          }}}
        />
        <Button
          onClick={() => { if (input.trim()) { setFields(f => Array.from(new Set([...f, input.trim()]))) ; setInput("") } }}
        >Add</Button>
      </Flex>

      {/* Show all visible fields with remove button */}
      <Box mb={6}>
        <Heading size="sm" mb={2}>Current visible fields</Heading>
        {fields.length === 0 ? (
          <Text color="gray.500">No visible fields configured.</Text>
        ) : (
          fields.map(f => (
            <Flex key={f} align="center" gap={2} mb={1}>
              <Text>{f}</Text>
              <Button size="xs" colorScheme="red" onClick={() =>
                setFields(fields.filter(x => x !== f))
              }>Remove</Button>
            </Flex>
          ))
        )}
      </Box>

    {/* Save button */}
      <Button colorScheme="blue" onClick={() => mutation.mutate(fields)} isLoading={mutation.isPending} mb={8}>
        Save
      </Button>

      {/* Search and add from all available fields */}
      <Box>
        <Heading size="sm" mb={2}>All available fields in messages</Heading>
        <Input
          placeholder="Search field..."
          value={search}
          mb={3}
          onChange={e => setSearch(e.target.value)}
        />
        {isLoadingAllFields ? (
          <Spinner mt={2} />
        ) : (
          allFields
            ?.filter(f => f.toLowerCase().includes(search.toLowerCase()))
            .map(f => (
              <Flex key={f} align="center" gap={2} mb={1}>
                <Text>{f}</Text>
                <Button size="xs"
                  isDisabled={fields.includes(f)}
                  onClick={() => setFields(fs => Array.from(new Set([...fs, f])))}>
                  Add
                </Button>
              </Flex>
            ))
        )}
      </Box>
    </Box>
  )
}
