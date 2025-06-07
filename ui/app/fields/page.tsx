'use client'

import { useAuth } from "../providers/AuthProvider"
import React, { useState, useEffect } from "react"
import {
  Box, Heading, Input, Button, Flex, Text, useToast, Spinner, Badge, Tooltip, useColorModeValue
} from "@chakra-ui/react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import axios from "axios"
import { useRouter } from "next/navigation"

export default function FieldsPage() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const router = useRouter()
  const { token, permissions } = useAuth() as any

  const [checked, setChecked] = useState(false)
  useEffect(() => {
    if (!token) {
      router.replace("/login")
    } else if (!permissions?.includes("manage_fields")) {
      router.replace("/no-access")
    } else {
      setChecked(true)
    }
  }, [token, permissions, router])

  const { data: visibleFields, isLoading } = useQuery<string[]>({
    queryKey: ['visibleFields'],
    queryFn: () => axios.get('/api/config/visible-fields').then(r => r.data),
    enabled: checked,
  })

  const { data: allFields, isLoading: isLoadingAllFields } = useQuery<string[]>({
    queryKey: ['allMessageFields'],
    queryFn: () => axios.get('/api/messages/fields').then(r => r.data),
    enabled: checked,
  })

  const [fields, setFields] = useState<string[]>([])
  const [search, setSearch] = useState("")

  useEffect(() => {
    if (visibleFields) setFields(visibleFields)
  }, [visibleFields])

  const mutation = useMutation({
    mutationFn: (fields: string[]) =>
      axios.put('/api/config/visible-fields', { visibleFields: fields }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visibleFields'] })
      toast({ title: "Fields updated!", status: "success", position: "top" })
    },
    onError: () => {
      toast({ title: "Failed to update fields", status: "error", position: "top" })
    }
  })

  const cardBg = useColorModeValue('gray.50', 'gray.800')

  if (!checked) return <Box p={8}><Spinner size="xl" /></Box>

  return (
    <Box maxW="2xl" mx="auto" p={8}>
      <Heading size="lg" mb={3}>Customize Visible Fields</Heading>
      <Text mb={4} color="gray.600">
        These fields control what parts of the message content are shown on the <b>Messages</b> page.
      </Text>

      {/* Selected Fields Section */}
      <Box bg={cardBg} p={4} rounded="md" mb={6} boxShadow="md">
        <Heading size="sm" mb={3}>Currently Selected Fields</Heading>
        {fields.length === 0 ? (
          <Text color="gray.400">No visible fields configured.</Text>
        ) : (
          <Flex gap={2} flexWrap="wrap">
            {fields.map(f => (
              <Tooltip label={f} key={f} hasArrow>
                <Badge
                  colorScheme="teal"
                  variant="subtle"
                  px={3}
                  py={2}
                  borderRadius="lg"
                  fontSize="sm"
                  mb={1}
                  display="flex"
                  alignItems="center"
                >
                  <span style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f}</span>
                  <Button
                    onClick={() => setFields(fields.filter(x => x !== f))}
                    size="xs"
                    ml={2}
                    colorScheme="red"
                    variant="ghost"
                    borderRadius="full"
                    minW="1.5em"
                    h="1.5em"
                    p={0}
                  >×</Button>
                </Badge>
              </Tooltip>
            ))}
          </Flex>
        )}
      </Box>

      {/* Save Button */}
      <Button
        colorScheme="green"
        mb={8}
        isDisabled={mutation.isPending || JSON.stringify(visibleFields) === JSON.stringify(fields)}
        onClick={() => mutation.mutate(fields)}
        isLoading={mutation.isPending}
      >
        Save Changes
      </Button>

      {/* All Available Fields Section */}
      <Box bg={cardBg} p={4} rounded="md" boxShadow="md">
        <Heading size="sm" mb={3}>Available Fields</Heading>
        <Input
          placeholder="Search field..."
          value={search}
          mb={4}
          onChange={e => setSearch(e.target.value)}
        />
        {isLoadingAllFields ? (
          <Spinner mt={2} />
        ) : (
          <Flex gap={2} flexWrap="wrap">
            {allFields
              ?.filter(f => f.toLowerCase().includes(search.toLowerCase()))
              .map(f => (
                <Badge
                  key={f}
                  colorScheme={fields.includes(f) ? "gray" : "blue"}
                  variant={fields.includes(f) ? "subtle" : "solid"}
                  px={3}
                  py={2}
                  borderRadius="lg"
                  fontSize="sm"
                  mb={1}
                  mr={1}
                  opacity={fields.includes(f) ? 0.5 : 1}
                  cursor={fields.includes(f) ? "not-allowed" : "pointer"}
                  onClick={() => !fields.includes(f) && setFields(fs => Array.from(new Set([...fs, f])))}
                >
                  {f}
                </Badge>
              ))
            }
          </Flex>
        )}
      </Box>
    </Box>
  )
}

