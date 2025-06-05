'use client';

import {
  Box, Heading, Table, Thead, Tbody, Tr, Th, Td,
  Flex, Spinner, Badge, Code, Text
} from '@chakra-ui/react';
import { useAuth } from '../providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useEffect, useMemo } from 'react';

function renderParsed(parsed: any) {
  if (!parsed) return <Text>-</Text>;

  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch {
      return <Code colorScheme="red">{parsed}</Code>;
    }
  }

  if (
    typeof parsed === 'object' &&
    parsed !== null &&
    Object.keys(parsed).length === 1 &&
    (parsed as any).message
  ) {
    parsed = (parsed as any).message;
  }

  const rows: JSX.Element[] = [];
  const walk = (obj: any, path = '') => {
    for (const [k, v] of Object.entries(obj)) {
      const p = path ? `${path}.${k}` : k;
      if (typeof v === 'object' && v !== null) walk(v, p);
      else
        rows.push(
          <Box key={p} px={2} py={1} fontSize="sm">
            <Code>{p} = {String(v)}</Code>
          </Box>
        );
    }
  };
  walk(parsed);
  return (
    <Box p={2} bg="gray.50" borderRadius="md" maxH="200px" overflow="auto">
      {rows}
    </Box>
  );
}

// *** Новата AI Result колона като отделна функция ***
function renderAiResult(aiResult: any) {
  if (!aiResult || !aiResult.label) return <Text>-</Text>;
  const color = aiResult.label === 'Allowed' ? 'green'
    : aiResult.label === 'Forbidden' ? 'red'
    : aiResult.label === 'Maybe' ? 'yellow'
    : 'gray';

  // Взимаме всички, но пропускаме главния label
  const { raw } = aiResult;
  let otherLabels: { lbl: string; score: number }[] = [];
  if (raw?.labels?.length > 1 && raw?.scores?.length === raw.labels.length) {
    otherLabels = raw.labels
      .map((lbl: string, idx: number) => ({ lbl, score: raw.scores[idx] }))
      .filter(obj => obj.lbl !== aiResult.label); // махаме главния
  }

  return (
    <Box>
      <Badge
        colorScheme={color}
        px={2}
        py={1}
        fontSize="xs"
        fontWeight="bold"
        variant="solid"
        mr={1}
      >
        {aiResult.label.toUpperCase()} {typeof aiResult.score === 'number' ? `(${(aiResult.score * 100).toFixed(0)}%)` : ''}
      </Badge>
      {otherLabels.length > 0 &&
        <Box mt={1} fontSize="0.75em" display="flex" gap={1} flexWrap="wrap">
          {otherLabels.map(({ lbl, score }) => (
            <Badge
              key={lbl}
              colorScheme={
                lbl === 'Allowed' ? 'green'
                  : lbl === 'Forbidden' ? 'red'
                  : lbl === 'Maybe' ? 'yellow'
                  : 'gray'
              }
              variant="subtle"
              px={1.5}
              py={0.5}
              fontSize="1em"
              fontWeight="semibold"
            >
              {lbl.toUpperCase()} {score !== undefined ? `(${(score * 100).toFixed(0)}%)` : ''}
            </Badge>
          ))}
        </Box>
      }
    </Box>
  );
}
export default function MessagesPage() {
  const { token, permissions } = useAuth() as any;
  const router = useRouter();

  const canView = useMemo(
    () => !!token && permissions?.includes('view_messages'),
    [token, permissions]
  );

  useEffect(() => {
    if (!token) {
      router.replace('/login');
    } else if (!canView) {
      router.replace('/no-access');
    }
  }, [token, canView, router]);

  if (!canView) {
    return (
      <Flex justify="center" mt={24}>
        <Spinner size="xl" />
      </Flex>
    );
  }

  const { data: messages, isLoading, error } = useQuery({
    queryKey: ['messages'],
    queryFn : () => axios.get('/api/messages').then(r => r.data),
    staleTime: 30_000
  });

  if (error) {
    return (
      <Flex justify="center" mt={24}>
        <Text color="red.500">Грешка при зареждане на съобщенията</Text>
      </Flex>
    );
  }

  return (
    <Box maxW="6xl" mx="auto" p={8}>
      <Heading size="lg" mb={6}>Messages</Heading>

      {isLoading ? (
        <Flex justify="center" py={10}><Spinner /></Flex>
      ) : (
        <Table size="sm" bg="white" borderRadius="lg" boxShadow="md">
          <Thead bg="gray.200">
            <Tr>
              <Th w="40%">Parsed</Th>
              <Th>Status</Th>
              <Th>Matched Rule</Th>
              <Th>Tags</Th>
              <Th>AI Result</Th>
              <Th>Received</Th>
            </Tr>
          </Thead>
          <Tbody>
            {messages?.map((m: any) => (
              <Tr key={m._id} _hover={{ bg: 'gray.50' }}>
                <Td>{renderParsed(m.parsed)}</Td>
                <Td>
                  {m.status === 'Allowed'   && <Badge colorScheme="green">✅ Allowed</Badge>}
                  {m.status === 'Forbidden' && <Badge colorScheme="red">❌ Forbidden</Badge>}
                  {m.status === 'Maybe'     && <Badge colorScheme="yellow">⚠️ Maybe</Badge>}
                  {m.status === 'Tag'       && <Badge colorScheme="blue">🏷️ Tag</Badge>}
                </Td>
                <Td>{m.matchedRule || '-'}</Td>
                <Td>{m.tags?.join(', ') || '-'}</Td>
                <Td>{renderAiResult(m.aiResult)}</Td>
                <Td>{new Date(m.receivedAt).toLocaleString()}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </Box>
  );
}
