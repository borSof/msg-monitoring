'use client'

import React from "react";
import { useAuth } from "../providers/AuthProvider"
import {
  Box, Heading, List, ListItem, Flex, Text, Icon, Button, Spinner, useColorModeValue
} from "@chakra-ui/react"
import { FaExclamationTriangle, FaCheckCircle, FaTimesCircle } from "react-icons/fa"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import axios from "axios"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

interface Message {
  _id: string
  parsed: any
  status: string
}

const renderParsed = (obj: any, prefix = ''): React.ReactElement[] => {
  const out: React.ReactElement[] = []
  for (const k in obj) {
    const path = prefix ? `${prefix}.${k}` : k
    if (typeof obj[k] === 'object' && obj[k] !== null) {
      out.push(...renderParsed(obj[k], path))
    } else {
      out.push(
        <Text key={path} fontFamily="mono" fontSize="sm" whiteSpace="pre-wrap" color="gray.700">
          {path} = <b>{String(obj[k])}</b>
        </Text>
      )
    }
  }
  return out
}

export default function MaybePage() {
  const { token, permissions } = useAuth() as any
  const router = useRouter()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (!token) {
      router.replace("/login")
    } else if (!permissions?.includes("review_maybe")) {
      router.replace("/no-access")
    } else {
      setChecked(true)
    }
  }, [token, permissions, router])

  const queryClient = useQueryClient()
  const { data, isLoading, error } = useQuery<Message[]>({
    queryKey: ['maybe'],
    queryFn: () => axios.get('/api/messages/maybe').then(r => r.data),
    staleTime: 30_000,
    enabled: checked,
  })

const mutation = useMutation({
  mutationFn: ({ id, status }: { id: string, status: string }) =>
    axios.patch(`/api/messages/${id}/status`, { status }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['maybe'] })
    queryClient.invalidateQueries({ queryKey: ['messages'] })
  }
})
  const boxBg = useColorModeValue("white", "gray.800")
  const headingColor = useColorModeValue("gray.800", "gray.100")

  if (!checked) return (
    <Flex justify="center" align="center" minH="50vh">
      <Spinner size="xl" color="yellow.500" />
    </Flex>
  )

  if (isLoading) return (
    <Flex justify="center" align="center" minH="50vh">
      <Spinner size="xl" color="yellow.500" />
    </Flex>
  )

  if (error) return <Text p={6} color="red.500">Error loading maybe allowed messages</Text>
  if (!data?.length) return <Text p={6}>Няма Maybe Allowed съобщения</Text>

  return (
    <Box
      bg={boxBg}
      maxW={{ base: "95vw", md: "2xl" }}
      mx="auto"
      mt={{ base: 4, md: 12 }}
      p={{ base: 2, md: 8 }}
      borderRadius="2xl"
      boxShadow="lg"
      w="full"
      minH="60vh"
    >
      <Heading size="lg" mb={6} color={headingColor}>Maybe Allowed (Ръчно ревю)</Heading>
      <List spacing={5}>
        {data.map((m) => (
          <ListItem key={m._id}>
            <Box bg="gray.50" border="1px" borderColor="gray.200" borderRadius="md" p={4}>
              <Flex align="center" justify="space-between" gap={4} wrap="wrap">
                <Box>
                  <Icon as={FaExclamationTriangle} color="yellow.500" boxSize={4} mr={2} />
                  {renderParsed(m.parsed)}
                </Box>
                <Flex gap={2}>
                  <Button
                    size="sm"
                    colorScheme="green"
                    leftIcon={<FaCheckCircle />}
                    onClick={() => mutation.mutate({ id: m._id, status: "Allowed" })}
                    isLoading={mutation.isPending}
                  >Allow</Button>
                  <Button
                    size="sm"
                    colorScheme="red"
                    leftIcon={<FaTimesCircle />}
                    onClick={() => mutation.mutate({ id: m._id, status: "Forbidden" })}
                    isLoading={mutation.isPending}
                  >Forbid</Button>
                </Flex>
              </Flex>
            </Box>
          </ListItem>
        ))}
      </List>
    </Box>
  )
}
