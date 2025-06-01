'use client'

import { useAuth } from "../providers/AuthProvider"
import { useState, useEffect } from "react"
import {
  Box, Heading, List, ListItem, Flex, Text, Icon, Spinner, useColorModeValue, useColorMode, IconButton,
  useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, Code
} from "@chakra-ui/react"
import { FaCheckCircle, FaExclamationTriangle, FaTimesCircle, FaMoon, FaSun } from "react-icons/fa"
import { useQuery } from "@tanstack/react-query"
import axios from "axios"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"

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
  parsed: any
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

// helper за достъп до вложени полета като "message.text"
function getField(obj: any, path: string) {
  return path.split('.').reduce((o, p) => (o ? o[p] : undefined), obj)
}

export default function MessagesPage() {
  const { token, permissions } = useAuth() as any
  const router = useRouter()
  const [checked, setChecked] = useState(false)

  // Guard logic
  useEffect(() => {
    if (!token) {
      router.replace("/login")
    } else if (!permissions?.includes("view_messages")) {
      router.replace("/no-access")
    } else {
      setChecked(true)
    }
  }, [token, permissions, router])

  // --- HOOKS винаги остават в началото ---
  const { data, isLoading, error } = useQuery<Message[]>({
    queryKey: ['messages'],
    queryFn: () => axios.get('/api/messages').then(r => r.data),
    staleTime: 30_000,
    enabled: checked // <-- само ако е минал guard-а!
  })

  const { data: visibleFields, isLoading: loadingFields } = useQuery<string[]>({
    queryKey: ['visibleFields'],
    queryFn: () => axios.get('/api/config/visible-fields').then(r => r.data),
    enabled: checked
  })

  const [selected, setSelected] = useState<Message | null>(null)
  const { isOpen, onOpen, onClose } = useDisclosure()

  const boxBg = useColorModeValue("white", "gray.800")
  const headingColor = useColorModeValue("gray.800", "gray.100")

  // Guard spinner (докато не е проверено)
  if (!checked) return (
    <Flex justify="center" align="center" minH="50vh">
      <Spinner size="xl" color="blue.500" />
    </Flex>
  )

  if (isLoading || loadingFields) return (
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
              <ListItem
                _hover={{ bg: useColorModeValue("gray.100", "gray.700"), cursor: "pointer" }}
                borderRadius="md"
                px={2}
                onClick={() => { setSelected(m); onOpen(); }}
              >
                <Flex align="center" justify="space-between" flexWrap="wrap">
                  <Flex direction="column" gap={1} maxW="65vw">
                    {visibleFields?.length
                      ? visibleFields.map(field => (
                          <Text fontSize="md" key={field} isTruncated>
                            <b>{field}:</b> {String(getField(m.parsed, field) ?? '—')}
                          </Text>
                        ))
                      : <Text fontSize="md" isTruncated>
                          {m.parsed?.message?.text || JSON.stringify(m.parsed)}
                        </Text>
                    }
                  </Flex>
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

      {/* Детайли за съобщението */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Message Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selected && (
              <Code width="100%" whiteSpace="pre" fontSize="md" borderRadius="md" p={2}>
                {JSON.stringify(selected.parsed, null, 2)}
              </Code>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  )
}
