import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

export default function Chat({ socket }) {
    const [messages, setMessages] = useState([])
    const [input, setInput] = useState('')

    const navigate = useNavigate()
  
    useEffect(() => {
      const messageHandler = (msg) => {
        console.log(msg)
        setMessages((prev) => [...prev, msg])
      }
  
      socket.on('message', messageHandler)
      
      return () => {
        socket.off('message', messageHandler)
      }
    }, [])
  
    const sendMessage = () => {
      if (input.trim()) {
        socket.emit('message', input)
        setInput('')
      }
    }

  return (
    <div>
        <button onClick={() => {navigate('/login')}}>login/signup</button>
        <h1>React with Socket.IO</h1>
        <div>
          {messages.map((msg, idx) => (
            <p key={idx}>{msg}</p>
          ))}
        </div>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
        />
        <button onClick={sendMessage}>Send</button>
    </div>
  )
}
