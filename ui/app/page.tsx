'use client'

import { Box, Heading, List, ListItem, Flex, Text, Icon, Spinner, useColorModeValue, useColorMode, IconButton } from "@chakra-ui/react"
import { FaCheckCircle, FaExclamationTriangle, FaTimesCircle, FaMoon, FaSun } from "react-icons/fa"
import { useQuery } from "@tanstack/react-query"
import axios from "axios"
import { motion } from "framer-motion"

function ColorModeSwitcher() {
  const { colorMode, toggleColorMode } = useColorMode()
  return (
    <IconButton
      aria-label="Toggle dark mode"
      icon={colorMode === "light" ? <FaMoon /> : <FaSun />}
      onClick={toggleColorMode}
      position="absolute"
      top={4}
      right={4}
      size="md"
      variant="ghost"
      zIndex={1}
    />
  )
}

interface Message {
  _id: string
  parsed: { message: { text: string } }
  status: string
}

function getStatusProps(status: string) {
  switch (status) {
    case "Forbidden":
      return { color: "red.500", icon: FaTimesCircle }
    case "Maybe":
      return { color: "yellow.500", icon: FaExclamationTriangle }
    default:
      return { color: "green.600", icon: FaCheckCircle }
  }
}

export default function MessagesPage() {
  const { data, isLoading, error } = useQuery<Message[]>({
    queryKey: ['messages'],
    queryFn: () => axios.get('/api/messages').then(r => r.data),
    staleTime: 30_000
  })

  const boxBg = useColorModeValue("white", "gray.800")
  const headingColor = useColorModeValue("gray.800", "gray.100")

  if (isLoading) return (
    <Flex justify="center" align="center" minH="50vh">
      <Spinner size="xl" color="blue.500" />
    </Flex>
  )

  if (error) return <Text p={6} color="red.500">Error loading messages</Text>
return (
    <Box
      bg={boxBg}
      maxW={{ base: "95vw", md: "2xl" }}
      mx="auto"
      mt={{ base: 4, md: 12 }}
      p={{ base: 2, md: 8 }}
      borderRadius="2xl"
      boxShadow="lg"
      position="relative"
      w="full"
      minH="60vh"
    >
      <ColorModeSwitcher />
      <Heading size="lg" mb={6} color={headingColor}>Messages</Heading>
      <List spacing={5}>
        {data!.map((m, i) => {
          const { color, icon } = getStatusProps(m.status)
          return (
            <motion.div
              key={m._id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <ListItem>
                <Flex align="center" justify="space-between" flexWrap="wrap">
                  <Text fontSize="lg" color={headingColor} maxW="65vw" isTruncated>
                    {m.parsed.message.text}
                  </Text>
                  <Flex align="center" minW="120px" justify="end">
                    <Icon as={icon} color={color} boxSize={5} mr={2} />
                    <Text fontWeight="bold" color={color} fontSize="lg">
                      {m.status}
                    </Text>
                  </Flex>
                </Flex>
              </ListItem>
            </motion.div>
          )
        })}
      </List>
    </Box>
  )
}
