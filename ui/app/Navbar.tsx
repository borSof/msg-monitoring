'use client'

import { Box, Flex, Link, Heading, Spacer, useColorModeValue } from "@chakra-ui/react"
import NextLink from 'next/link'

export function Navbar() {
  const bg = useColorModeValue('gray.100', 'gray.900')
  const color = useColorModeValue('gray.800', 'gray.200')

  return (
    <Box bg={bg} px={6} py={3} boxShadow="sm" mb={4}>
      <Flex align="center">
        <Heading size="md" color={color}>
          MSG Monitoring
        </Heading>
        <Spacer />
        <Flex gap={4}>
          <Link as={NextLink} href="/" color={color} fontWeight="medium" _hover={{ textDecoration: "underline", color: "blue.500" }}>
            Messages
          </Link>
          <Link as={NextLink} href="/rules" color={color} fontWeight="medium" _hover={{ textDecoration: "underline", color: "blue.500" }}>
            Rules
          </Link>
<Link as={NextLink} href="/maybe" color={color} fontWeight="medium" _hover={{ textDecoration: "underline", color: "orange.400" }}>
  Maybe
</Link>

<Link as={NextLink} href="/fields" color={color} fontWeight="medium" _hover={{ textDecoration: "underline", color: "teal.400" }}>
  Fields
</Link>

<Link as={NextLink} href="/status" color={color} fontWeight="medium" _hover={{ textDecoration: "underline", color: "teal.400" }}>
  Status
</Link>  
      </Flex>
      </Flex>
    </Box>
  )
}
