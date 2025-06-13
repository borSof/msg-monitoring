'use client'
import {
  Box, Heading, Input, Button, Flex, Text, Select, Switch, Spinner, Badge, FormLabel, useToast
} from "@chakra-ui/react"
import { useEffect, useState } from "react"
import { api } from "../api"

interface Channel {
  _id: string
  name: string
  callbackUrl: string
  format: string
  active: boolean
  triggerOn: string
}

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<Partial<Channel>>({
    name: "", callbackUrl: "", format: "json", active: true, triggerOn: "Allowed"
  })
  const [editId, setEditId] = useState<string | null>(null)

  // AI settings state
  const [aiEnabled, setAiEnabled] = useState(true)
  const [aiToken, setAiToken] = useState('')
  const [aiModel, setAiModel] = useState('facebook/bart-large-mnli')
  const [aiLoading, setAiLoading] = useState(false)
  const toast = useToast()

  // Зареждане на каналите
  async function loadChannels() {
    setLoading(true)
    const res = await api.get('/api/channels')
    setChannels(res.data)
    setLoading(false)
  }
  useEffect(() => { loadChannels() }, [])

  // AI config зареждане
  useEffect(() => {
    api.get('/api/config/ai').then(r => {
      setAiEnabled(r.data.aiEnabled)
      setAiToken(r.data.aiToken)
      setAiModel(r.data.aiModel)
    })
  }, [])
  // Запази AI конфиг
  function saveAIConfig() {
    if (typeof aiToken !== 'string' || aiToken.trim().length === 0) {
      toast({ title: "Моля въведи валиден HuggingFace API Token", status: "error" });
      return;
    }

    if (typeof aiModel !== 'string' || aiModel.trim().length === 0) {
      toast({ title: "Моля въведи валиден модел (напр. facebook/bart-large-mnli)", status: "error" });
      return;
    }

    setAiLoading(true);
    api.put('/api/config/ai', {
      aiEnabled,
      aiToken: aiToken.trim(),
      aiModel: aiModel.trim()
    })
      .then(() => {
        setAiLoading(false);
        toast({ title: "AI настройките са запазени!", status: "success" });
      })
      .catch((err) => {
        setAiLoading(false);
        toast({ title: "Грешка при запис на AI настройките", status: "error" });
        console.error("AI save error:", err);
      });
  }

  // Създаване/редактиране на канал
  async function saveChannel() {
    if (!form.name || !form.callbackUrl) return alert("Попълни име и URL!");
    if (editId) {
      await api.put('/api/channels/' + editId, form);
    } else {
      await api.post('/api/channels', form);
    }
    setForm({ name: "", callbackUrl: "", format: "json", active: true, triggerOn: "Allowed" });
    setEditId(null);
    loadChannels();
  }

  // Изтриване
  async function deleteChannel(id: string) {
    if (!window.confirm("Сигурен ли си?")) return
    await api.delete('/api/channels/' + id)
    loadChannels()
  }

  // Редакция
  function handleEdit(ch: Channel) {
    setForm({
      name: ch.name,
      callbackUrl: ch.callbackUrl,
      format: ch.format,
      active: ch.active,
      triggerOn: ch.triggerOn
    })
    setEditId(ch._id)
  }

  return (
    <Box maxW="2xl" mx="auto" p={8}>
      <Heading size="lg" mb={6}>Интеграционни канали (Webhooks)</Heading>

      {/* AI Класификация секция */}
      <Box borderWidth={1} borderRadius="lg" p={4} mb={6} bg="gray.50">
        <Heading size="sm" mb={3}>AI Класификация</Heading>
        <Flex align="center" mb={2} gap={3}>
          <FormLabel m={0}>AI Enabled</FormLabel>
          <Switch isChecked={aiEnabled} onChange={e => setAiEnabled(e.target.checked)} />
        </Flex>
        <Input
          placeholder="HuggingFace API Token"
          value={aiToken}
          type="password"
          onChange={e => setAiToken(e.target.value)}
          mb={2}
        />
        <Input
          placeholder="AI Model (напр. facebook/bart-large-mnli)"
          value={aiModel}
          onChange={e => setAiModel(e.target.value)}
          mb={2}
        />
        <Button colorScheme="blue" onClick={saveAIConfig} isLoading={aiLoading}>
          Запази AI настройките
        </Button>
      </Box>

      {/* Форма за добавяне/редактиране на канал */}
      <Box p={4} mb={6} borderWidth={1} borderRadius="lg">
        <Flex gap={2} mb={2}>
          <Input placeholder="Име" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <Input placeholder="URL" value={form.callbackUrl || ''} onChange={e => setForm(f => ({ ...f, callbackUrl: e.target.value }))} />
        </Flex>
        <Flex gap={2} mb={2}>
          <Select value={form.format} onChange={e => setForm(f => ({ ...f, format: e.target.value }))}>
            <option value="json">JSON</option>
            <option value="xml">XML</option>
          </Select>
          <Select value={form.triggerOn} onChange={e => setForm(f => ({ ...f, triggerOn: e.target.value }))}>
            <option value="Allowed">Allowed</option>
            <option value="Forbidden">Forbidden</option>
            <option value="Maybe">Maybe</option>
          </Select>
          <Flex align="center" gap={1}>
            <Switch isChecked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} />
            <Text>Active</Text>
          </Flex>
          <Button colorScheme="green" onClick={saveChannel}>
            {editId ? "Save" : "Add"}
          </Button>
          {editId && (
            <Button onClick={() => { setEditId(null); setForm({ name: "", callbackUrl: "", format: "json", active: true, triggerOn: "Allowed" }) }}>Cancel</Button>
          )}
        </Flex>
      </Box>

      {loading ? <Spinner /> : (
        channels.map(ch =>
          <Flex key={ch._id} align="center" borderBottom="1px solid #eee" py={2} gap={4}>
            <Text flex="1"><b>{ch.name}</b> &mdash; <span style={{ fontSize: 12 }}>{ch.callbackUrl}</span></Text>
            <Badge colorScheme={ch.active ? "green" : "gray"}>{ch.active ? "Active" : "Inactive"}</Badge>
            <Text fontSize="sm">{ch.format}</Text>
            <Text fontSize="sm">{ch.triggerOn}</Text>
            <Button size="xs" colorScheme="blue" onClick={() => handleEdit(ch)}>Edit</Button>
            <Button size="xs" colorScheme="red" onClick={() => deleteChannel(ch._id)}>Delete</Button>
          </Flex>
        )
      )}
    </Box>
  )
}
