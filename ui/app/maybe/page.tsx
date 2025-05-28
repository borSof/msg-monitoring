'use client'

import { Box, Heading, List, ListItem, Flex, Text, Icon, Button, Spinner, useColorModeValue } from "@chakra-ui/react"
import { FaExclamationTriangle, FaCheckCircle, FaTimesCircle } from "react-icons/fa"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import axios from "axios"

interface Message {
  _id: string
  parsed: { message: { text: string } }
  status: string
}

export default function MaybePage() {
  const queryClient = useQueryClient()
  const { data, isLoading, error } = useQuery<Message[]>({
    queryKey: ['maybe'],
    queryFn: () => axios.get('/api/messages/maybe').then(r => r.data),
    staleTime: 30_000
  })

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string, status: string }) =>
      axios.patch(`/api/messages/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries(['maybe'])
      queryClient.invalidateQueries(['messages'])
    }
  })

  const boxBg = useColorModeValue("white", "gray.800")
  const headingColor = useColorModeValue("gray.800", "gray.100")

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
            <Flex align="center" justify="space-between" gap={2} wrap="wrap">
              <Text fontSize="md" color={headingColor} maxW="55vw" isTruncated>
                <Icon as={FaExclamationTriangle} color="yellow.500" boxSize={4} mr={2} />
                {m.parsed.message.text}
              </Text>
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
          </ListItem>
        ))}
      </List>
    </Box>
  )
}
