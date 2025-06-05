'use client';

import React, { useState } from 'react';
import {
  Box,
  VStack,
  FormControl,
  FormLabel,
  Input,
  Button,
  useToast,
  Text
} from '@chakra-ui/react';
import axios from 'axios';
import { useAuth } from '../providers/AuthProvider';

export default function Settings() {
  const { token } = useAuth() as any;               // токенът идва от контекста
  const [oldPw,  setOldPw]  = useState('');
  const [newPw,  setNewPw]  = useState('');
  const [confPw, setConfPw] = useState('');
  const [error,  setError]  = useState('');
  const [loading,setLoad]   = useState(false);
  const toast = useToast();

  /* -------- сменяме парола -------- */
  const handleChange = async () => {
    if (newPw !== confPw) {
      setError('Паролите не съвпадат!');
      return;
    }
    if (!token) {
      setError('Не сте логнати. Моля, влезте отново.');
      return;
    }

    setLoad(true);
    setError('');

    try {
      await axios.put(
        '/api/users/self/change-password',
        { oldPassword: oldPw, newPassword: newPw },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast({
        title: 'Паролата е променена успешно',
        status: 'success',
        duration: 4000,
        isClosable: true
      });

      setOldPw('');
      setNewPw('');
      setConfPw('');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Грешка при смяна на паролата');
    } finally {
      setLoad(false);
    }
  };

  /* -------- UI -------- */
  return (
    <Box maxW="400px" mx="auto" p={6}>
      <VStack spacing={4} align="stretch">
        <FormControl isRequired>
          <FormLabel>Стара парола</FormLabel>
          <Input
            type="password"
            value={oldPw}
            onChange={e => setOldPw(e.target.value)}
          />
        </FormControl>

        <FormControl isRequired>
          <FormLabel>Нова парола</FormLabel>
          <Input
            type="password"
            value={newPw}
            onChange={e => setNewPw(e.target.value)}
          />
        </FormControl>

        <FormControl isRequired>
          <FormLabel>Потвърдете новата парола</FormLabel>
          <Input
            type="password"
            value={confPw}
            onChange={e => setConfPw(e.target.value)}
          />
        </FormControl>

        {error && <Text color="red.500">{error}</Text>}

        <Button
          colorScheme="blue"
          onClick={handleChange}
          isLoading={loading}
          loadingText="Променям…"
        >
          Смени паролата
        </Button>
      </VStack>
    </Box>
  );
}
