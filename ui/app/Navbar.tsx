'use client';

import {
  Box, Flex, Link, Heading, Spacer, useColorModeValue,
  Menu, MenuButton, MenuList, MenuItem, Avatar, Button,
  HStack, Text
} from '@chakra-ui/react';
import { ChevronDownIcon } from '@chakra-ui/icons';
import NextLink from 'next/link';
import { useAuth } from './providers/AuthProvider';

const PAGES = [
  { href: '/messages', label: 'Messages', permission: 'view_messages' },
  { href: '/rules',    label: 'Rules',    permission: 'edit_rules'    },
  { href: '/maybe',    label: 'Maybe',    permission: 'review_maybe'  },
  { href: '/fields',   label: 'Fields',   permission: 'manage_fields' },
  { href: '/status',   label: 'Status',   permission: 'view_status'   },
  { href: '/users',    label: 'Users',    permission: 'manage_users'  },
  { href: '/roles',    label: 'Roles',    permission: 'manage_roles'  },
  { href: "/channels", label: "Channels", permission: "manage_channels" }
];

function Navbar() {
  const bg    = useColorModeValue('gray.100', 'gray.900');
  const color = useColorModeValue('gray.800', 'gray.200');

  const {
    token, username, permissions = [],
    setToken, setRole, setUsername, setPermissions
  } = (useAuth() as any) || {};

  const logout = () => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('role');
  localStorage.removeItem('username');
  localStorage.removeItem('permissions');
    setToken?.(null);
    setRole?.(null);
    setUsername?.(null);
    setPermissions?.([]);
    window.location.href = '/login';
  };

  return (
    <Box bg={bg} px={6} py={3} boxShadow="sm" mb={4}>
      <Flex align="center">
        <Heading size="md" color={color}>MSG Monitoring</Heading>
        <Spacer />

        {token ? (
          <Flex gap={4} align="center">
            {PAGES.filter(p => permissions.includes(p.permission)).map(p => (
              <Link
                as={NextLink}
                key={p.href}
                href={p.href}
                color={color}
                fontWeight="medium"
                _hover={{ textDecoration: 'underline', color: 'blue.500' }}
              >
                {p.label}
              </Link>
            ))}

            <Menu>
              <MenuButton
                as={Button}
                variant="ghost"
                rightIcon={<ChevronDownIcon />}
                _hover={{ bg: 'gray.300' }}
                _expanded={{ bg: 'gray.300' }}
              >
                <HStack spacing={2}>
                  <Avatar name={username} size="sm" />
                  <Text>{username}</Text>
                </HStack>
              </MenuButton>

              <MenuList>
                <MenuItem as={NextLink} href="/settings">Settings</MenuItem>
                <MenuItem onClick={logout}>Logout</MenuItem>
              </MenuList>
            </Menu>
          </Flex>
        ) : (
          <Link
            as={NextLink}
            href="/login"
            color={color}
            fontWeight="medium"
            _hover={{ textDecoration: 'underline', color: 'blue.500' }}
          >
            Login
          </Link>
        )}
      </Flex>
    </Box>
  );
}

/* ---------  EXPORTS  --------- */
export default Navbar;   
export { Navbar };
