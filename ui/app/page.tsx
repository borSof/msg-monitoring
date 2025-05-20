'use client'
import { useEffect, useState } from 'react'

interface Message {
  _id: string
  parsed: { message: { text: string } }
  status: string
}

export default function Page() {
  const [messages, setMessages] = useState<Message[]>([])

  useEffect(() => {
    fetch('/api/messages')
      .then(res => res.json())
      .then(setMessages)
      .catch(console.error)
  }, [])

  return (
    <main style={{ padding: 20 }}>
      <h1>Messages</h1>
      <ul>
        {messages.map(m => (
          <li key={m._id}>
            {m.parsed.message.text} — <strong>{m.status}</strong>
          </li>
        ))}
      </ul>
    </main>
  )
}
