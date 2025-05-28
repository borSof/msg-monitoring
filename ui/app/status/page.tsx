'use client'

import { Box, Heading, Flex, Text, Badge, SimpleGrid, Spinner, Code } from "@chakra-ui/react"
import { useQuery } from "@tanstack/react-query"
import axios from "axios"

export default function StatusPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['status'],
    queryFn: () => axios.get('/api/status').then(r => r.data),
    refetchInterval: 10_000
  })

  if (isLoading) return (
    <Flex justify="center" align="center" minH="40vh"><Spinner size="lg" /></Flex>
  )

  if (error) return <Text color="red.500">Error loading status</Text>

  return (
    <Box maxW="2xl" mx="auto" p={8}>
      <Heading size="lg" mb={4}>System Status</Heading>
      <Box mb={6}>
        <Heading size="sm">Backend</Heading>
        <Flex align="center" gap={3}>
          <Badge colorScheme="green">UP</Badge>
          <Text>Uptime: {Math.floor(data.server.uptime)}s</Text>
          <Text>Node: {data.server.node}</Text>
        </Flex>
        <Text>Last Checked: {new Date(data.server.time).toLocaleString()}</Text>
        <Text>Memory (RSS): {Math.round(data.server.memory/1024/1024)} MB</Text>
        <Text>CPU (1min): {data.server.cpu}</Text>
        <Text>Host: {data.server.hostname} ({data.server.platform}/{data.server.arch})</Text>
      </Box>
      <Box mb={6}>
        <Heading size="sm">Operating System</Heading>
        <Text>OS Uptime: {Math.floor(data.os.uptime/60)} min</Text>
        <Text>RAM: {Math.round(data.os.freemem/1024/1024)} MB free / {Math.round(data.os.totalmem/1024/1024)} MB total</Text>
        <Text>CPUs: {data.os.cpus}</Text>
        <Text>User: {data.os.user}</Text>
      </Box>
      <Box mb={6}>
        <Heading size="sm">MongoDB</Heading>
        <Flex align="center" gap={3}>
          <Badge colorScheme={data.mongo.status === 'connected' ? "green" : "red"}>
            {data.mongo.status.toUpperCase()}
          </Badge>
          <Text>DB: {data.mongo.name}</Text>
        </Flex>
        {data.mongo.ping && (
          <Code>{JSON.stringify(data.mongo.ping)}</Code>
        )}
      </Box>
      <Box mb={6}>
        <Heading size="sm">Main Endpoints</Heading>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={2}>
          {data.endpoints.map(ep => (
            <Code key={ep}>{ep}</Code>
          ))}
        </SimpleGrid>
      </Box>
      <Box mb={6}>
        <Heading size="sm">Last 10 Errors (server-error.log)</Heading>
        {data.lastErrors && data.lastErrors.length > 0 ? (
          <Code whiteSpace="pre" display="block" p={2}>
            {data.lastErrors.join('\n')}
          </Code>
        ) : (
          <Text color="green.600">No recent errors!</Text>
        )}
      </Box>
    </Box>
  )
}
