'use client';

import React from "react";
import {
  Box, Heading, Table, Thead, Tbody, Tr, Th, Td,
  Flex, Spinner, Badge, Code, Text, Button, Select, Input
} from '@chakra-ui/react';
import { useAuth } from '../providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const PAGE_SIZE = 30;

function getValueByPath(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((acc, key) => acc && acc[key] != null ? acc[key] : undefined, obj);
}

function renderParsed(parsed: any) {
  if (!parsed) return <Text>-</Text>;
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch {
      return <Code colorScheme="red">{parsed}</Code>;
    }
  }
  if (typeof parsed === 'object' && parsed !== null && Object.keys(parsed).length === 1 && (parsed as any).message) {
    parsed = (parsed as any).message;
  }
  const rows: React.ReactElement[] = [];
  const walk = (obj: any, path = '') => {
    for (const [k, v] of Object.entries(obj)) {
      const p = path ? `${path}.${k}` : k;
      if (typeof v === 'object' && v !== null) walk(v, p);
      else rows.push(
        <Box key={p} px={2} py={1} fontSize="sm">
          <Code>{p} = {String(v)}</Code>
        </Box>
      );
    }
  };
  walk(parsed);
  return <Box p={2} bg="gray.50" borderRadius="md" maxH="200px" overflow="auto">{rows}</Box>;
}

function renderVisibleFields(parsed: any, visibleFields: string[]) {
  if (!visibleFields?.length) return renderParsed(parsed);
  return (
    <Box>
      {visibleFields.map(f => (
        <Flex key={f} align="center" gap={2} mb={1}>
          <Text fontWeight="bold">{f}:</Text>
          <Code>{String(getValueByPath(parsed, f) ?? '-')}</Code>
        </Flex>
      ))}
    </Box>
  );
}

function renderAiResult(aiResult: any) {
  if (!aiResult || !aiResult.label) return <Text>-</Text>;
  const color = aiResult.label === 'Allowed' ? 'green'
    : aiResult.label === 'Forbidden' ? 'red'
    : aiResult.label === 'Maybe' ? 'yellow'
    : 'gray';
  const { raw } = aiResult;
  let otherLabels: { lbl: string; score: number }[] = [];
  if (raw?.labels?.length > 1 && raw?.scores?.length === raw.labels.length) {
    otherLabels = raw.labels
      .map((lbl: string, idx: number) => ({ lbl, score: raw.scores[idx] }))
      .filter((obj: { lbl: string; score: number }) => obj.lbl !== aiResult.label);
  }
  return (
    <Box>
      <Badge colorScheme={color} px={2} py={1} fontSize="xs" fontWeight="bold" variant="solid" mr={1}>
        {aiResult.label.toUpperCase()} {typeof aiResult.score === 'number' ? `(${(aiResult.score * 100).toFixed(0)}%)` : ''}
      </Badge>
      {otherLabels.length > 0 &&
        <Box mt={1} fontSize="0.75em" display="flex" gap={1} flexWrap="wrap">
          {otherLabels.map(({ lbl, score }) => (
            <Badge key={lbl} colorScheme={lbl === 'Allowed' ? 'green' : lbl === 'Forbidden' ? 'red' : lbl === 'Maybe' ? 'yellow' : 'gray'} variant="subtle" px={1.5} py={0.5} fontSize="1em" fontWeight="semibold">
              {lbl.toUpperCase()} {score !== undefined ? `(${(score * 100).toFixed(0)}%)` : ''}
            </Badge>
          ))}
        </Box>}
    </Box>
  );
}

type Status = 'Allowed' | 'Forbidden' | 'Maybe';
type StatusCount = { Allowed: number; Forbidden: number; Maybe: number; TimedOut: number; OriginalMaybe: number };

function isStatus(key: any): key is Status {
  return key === 'Allowed' || key === 'Forbidden' || key === 'Maybe';
}

function aggregateMessagesPerDay(messages: any[]): (StatusCount & { date: string })[] {
  const byDay: Record<string, StatusCount> = {};
  for (const m of messages) {
    const d = new Date(m.receivedAt);
    const day = d.toLocaleDateString();

    if (!byDay[day]) byDay[day] = { Allowed: 0, Forbidden: 0, Maybe: 0, TimedOut: 0, OriginalMaybe: 0 };

    // Всички с оригинален Maybe броим ТУК
    if (m.originalStatus === "Maybe") {
      byDay[day].OriginalMaybe++;
    }
    // Стандартните статуси
    if (m.status === "Allowed") {
      byDay[day].Allowed++;
    } else if (m.status === "Forbidden" && m.originalStatus === "Maybe") {
      byDay[day].TimedOut++;
    } else if (m.status === "Forbidden") {
      byDay[day].Forbidden++;
    } else if (m.status === "Maybe") {
      byDay[day].Maybe++;
    }
  }
  return Object.entries(byDay)
    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
    .map(([date, counts]) => ({ date, ...counts }));
}

function downloadCsv(messages: any[]) {
  if (!messages.length) return;
  const headers = ['parsed', 'status', 'matchedRule', 'tags', 'aiResult', 'receivedAt'];
  const rows = messages.map(m => [
    JSON.stringify(m.parsed),
    m.status,
    m.matchedRule,
    m.tags?.join(', ') || '',
    m.aiResult?.label || '',
    m.receivedAt ? new Date(m.receivedAt).toLocaleString() : ''
  ]);
  const csv =
    [headers.join(',')].concat(rows.map(r =>
      r.map(field => `"${(field ?? '').toString().replace(/"/g, '""')}"`).join(',')
    )).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'messages.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export default function MessagesPage() {
  const { token, permissions } = useAuth() as any;
  const router = useRouter();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [sortField, setSortField] = useState('receivedAt');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);

  const canView = useMemo(() => !!token && permissions?.includes('view_messages'), [token, permissions]);

  useEffect(() => {
    if (!token) router.replace('/login');
    else if (!canView) router.replace('/no-access');
  }, [token, canView, router]);

const { data, isLoading, error } = useQuery({
  queryKey: ['messages', page, pageSize, sortField, sortDir, statusFilter, search],
  queryFn: () => axios.get('/api/messages/paged', {
    params: {
      skip: page * pageSize,
      limit: pageSize,
      sort: sortField,
      dir: sortDir,
      status: statusFilter || undefined,
      q: search || undefined
    }
  }).then(r => r.data),
  placeholderData: (prev) => prev,
  staleTime: 10_000,
  refetchInterval: 4000
});

  const { data: visibleFields } = useQuery<string[]>({
    queryKey: ['visibleFields'],
    queryFn: () => axios.get('/api/config/visible-fields').then(r => r.data),
    staleTime: 60_000
  });

  // За чарта – може да ползваш всички, ако искаш история
  const { data: chartData } = useQuery({
    queryKey: ['chart-messages'],
    queryFn: () => axios.get('/api/messages/paged', {
      params: { skip: 0, limit: 5000 }
    }).then(r => aggregateMessagesPerDay(r.data.messages)),
    staleTime: 60000,
  });

  const messages = data?.messages || [];
  const total = data?.total || 0;
  const maxPage = Math.ceil(total / pageSize);

  if (!canView) return <Flex justify="center" mt={24}><Spinner size="xl" /></Flex>;
  if (error) return <Flex justify="center" mt={24}><Text color="red.500">Грешка при зареждане</Text></Flex>;

  return (
    <Box maxW="6xl" mx="auto" p={8}>
      <Heading size="lg" mb={6}>Messages</Heading>

      {/* Чарт */}
      {chartData && chartData.length > 0 && (
        <Box mb={6} p={2} bg="gray.50" borderRadius="md">
          <Heading size="sm" mb={2}>Статистика по дни</Heading>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Allowed" fill="#38a169" />
              <Bar dataKey="Forbidden" fill="#e53e3e" />
              <Bar dataKey="Maybe" fill="#ecc94b" />
              <Bar dataKey="TimedOut" fill="#ed8936" />
              <Bar dataKey="OriginalMaybe" fill="#4299e1" />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      )}

      {/* Филтри и търсачка */}
      <Flex mb={4} gap={3} flexWrap="wrap" align="center">
        <Input
          size="sm"
          placeholder="Търси в съобщения..."
          value={search}
          onChange={e => { setPage(0); setSearch(e.target.value); }}
          w="200px"
        />
        <Select placeholder="Sort by" value={sortField} onChange={e => setSortField(e.target.value)} w="130px" size="sm">
          <option value="receivedAt">Date</option>
          <option value="status">Status</option>
        </Select>
        <Select placeholder="Order" value={sortDir} onChange={e => setSortDir(e.target.value as 'asc' | 'desc')} w="120px" size="sm">
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </Select>
        <Select placeholder="Status" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0); }} w="130px" size="sm">
          <option value="Allowed">Allowed</option>
          <option value="Forbidden">Forbidden</option>
          <option value="Maybe">Maybe</option>
        </Select>
        {Array.isArray(visibleFields) && visibleFields.length > 0 && (
          <Button size="xs" onClick={() => setShowAll(s => !s)}>
            {showAll ? 'Show Only Selected Fields' : 'Show All Fields'}
          </Button>
        )}
        <Button size="sm" colorScheme="blue" onClick={() => downloadCsv(messages)}>Export to CSV</Button>
      </Flex>

      {/* Таблица */}
      {isLoading ? (
        <Flex justify="center" py={10}><Spinner /></Flex>
      ) : (
        <Table size="sm" bg="white" borderRadius="lg" boxShadow="md">
          <Thead bg="gray.200">
            <Tr>
              <Th>Parsed</Th>
              <Th>Status</Th>
              <Th>Matched Rule</Th>
              <Th>Tags</Th>
              <Th>AI Result</Th>
              <Th>Received</Th>
            </Tr>
          </Thead>
          <Tbody>
            {messages.map((m: any) => (
              <Tr key={m._id} _hover={{ bg: 'gray.50' }}>
                <Td>
                  {showAll || !visibleFields?.length
                    ? renderParsed(m.parsed)
                    : renderVisibleFields(m.parsed, visibleFields)}
                </Td>
                <Td>
                  {m.status === 'Forbidden' && m.originalStatus === 'Maybe' ? (
                    <Badge colorScheme="orange">⏰ Auto-Forbidden</Badge>
                  ) : m.status === 'Allowed' ? (
                    <Badge colorScheme="green">✅ Allowed</Badge>
                  ) : m.status === 'Forbidden' ? (
                    <Badge colorScheme="red">❌ Forbidden</Badge>
                  ) : m.status === 'Maybe' ? (
                    <Badge colorScheme="yellow">⚠️ Maybe</Badge>
                  ) : null}
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

      {/* Пагинация */}
      <Flex mt={6} gap={3} justify="center" align="center">
        <Button size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} isDisabled={page <= 0}>Назад</Button>
        <Text>Page {page + 1} / {maxPage} ({total} total)</Text>
        <Button size="sm" onClick={() => setPage(p => Math.min(maxPage - 1, p + 1))} isDisabled={page + 1 >= maxPage}>Напред</Button>
        <Select size="sm" value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(0); }} w="90px">
          {[10, 20, 30, 50, 100].map(sz => <option key={sz} value={sz}>{sz}</option>)}
        </Select>
      </Flex>
    </Box>
  );
}
