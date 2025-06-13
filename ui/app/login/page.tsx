'use client';

import { useState, useEffect } from 'react';
import {
  Box, Button, Input, Heading, FormControl, FormLabel,
  useToast, Text,
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { api } from '../api';
import { useAuth } from '../providers/AuthProvider';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading , setLoading ] = useState(false);
  const [error   , setError   ] = useState('');
  const router = useRouter();
  const toast  = useToast();
  const { setToken, setRole, setUsername: setUser, setPermissions } = useAuth() as any;

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    const perms = JSON.parse(localStorage.getItem('permissions') || '[]');
    const landing = [
      { href: '/messages', perm: 'view_messages' },
      { href: '/status'  , perm: 'view_status'   },
      { href: '/maybe'   , perm: 'review_maybe'  },
      { href: '/rules'   , perm: 'edit_rules'    },
      { href: '/fields'  , perm: 'manage_fields' },
      { href: '/users'   , perm: 'manage_users'  },
    ].find(p => perms.includes(p.perm));

    if (landing) router.replace(landing.href);
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data } = await api.post('/api/login', { username, password });

      localStorage.setItem('authToken'  , data.token);
      localStorage.setItem('role'       , data.role);
      localStorage.setItem('username'   , data.username);
      localStorage.setItem('permissions', JSON.stringify(data.permissions || []));

      setToken(data.token);
      setRole (data.role);
      setUser (data.username);
      setPermissions(data.permissions || []);

      toast({ title: 'Login success', status: 'success' });

      router.push('/messages');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box maxW="sm" mx="auto" mt={16} p={6} borderWidth="1px" borderRadius="xl">
      <Heading size="md" mb={6}>Login</Heading>

      <form onSubmit={handleLogin}>
        <FormControl mb={4}>
          <FormLabel>Username</FormLabel>
          <Input value={username} onChange={e => setUsername(e.target.value)} />
        </FormControl>

        <FormControl mb={4}>
          <FormLabel>Password</FormLabel>
          <Input type="password" value={password} onChange={e => setPassword(e.target.value)} />
        </FormControl>

        {error && <Text color="red.500" mb={3}>{error}</Text>}

        <Button type="submit" colorScheme="blue" isLoading={loading} w="full">
          Login
        </Button>
      </form>
    </Box>
  );
}
