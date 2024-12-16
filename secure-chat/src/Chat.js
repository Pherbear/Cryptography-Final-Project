import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

export default function Chat({ socket, loggedin, connectedUsers, keyPair }) {
  const [messages, setMessages] = useState([])
  const [chatinfo, setChatinfo] = useState()
  const [input, setInput] = useState('')
  const [checkedUsers, setCheckedUsers] = useState([])
  const [chatKey, setChatKey] = useState()
  const chatKeyRef = useRef(chatKey)

  const navigate = useNavigate()
  const { chatid } = useParams()

  const handleCheckUser = (event, user) => {
    const checked = event.target.checked
    if (checked) {
      if (!checkedUsers.includes(user)) setCheckedUsers([...checkedUsers, user])
    } else {
      setCheckedUsers(l => l.filter(item => item !== user))
    }
  }

  const decryptMessage = async ({ ciphertext, iv }) => {
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      chatKeyRef.current,
      ciphertext
    );
    const decryptedMessage = new TextDecoder().decode(decryptedBuffer)
    return decryptedMessage
  }

  const importSymmetricKey = async (key) => {
    const keyBuffer = Uint8Array.from(atob(key), (char) => char.charCodeAt(0));
    const cryptoKey = await window.crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );
    return cryptoKey
  }

  const decryptEncryptedKey = async (encryptedKey) => {
    const { privateKey } = keyPair
    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: "RSA-OAEP"
      },
      privateKey,
      encryptedKey
    )
    const decoder = new TextDecoder()
    const decodedKey = decoder.decode(decrypted)
    return decodedKey
  }
  
  useEffect(() => {
    const messageHandler = async (msg) => {
      const { encryptedMessageData } = msg
      if (encryptedMessageData) {
        const { ciphertext, iv } = encryptedMessageData
        const decryptedMessage = await decryptMessage({ ciphertext, iv })
        setMessages((prev) => [...prev, {...msg, text: decryptedMessage}])
      } else {
        setMessages((prev) => [...prev, msg])
      }
    }
    
    const chatFailureHandler = (error) => {
      alert(error)
    }
    
    const requestChatInfoHandler = async (info) => {
      setChatinfo(info)
      let cryptoKey
      try {
        const symmetricKey = await decryptEncryptedKey(info.encryptedKey)
        cryptoKey = await importSymmetricKey(symmetricKey)
      } catch {
        console.log('crypto key invalid!')
      } finally {
        setChatKey(cryptoKey)
        chatKeyRef.current = cryptoKey
      }
    }
    
    const chatExitHandler = () => {
      navigate('/home')
    }

    socket.on('chat-info', requestChatInfoHandler)
    socket.on('chat-exit', chatExitHandler)
    socket.on('message', messageHandler)
    socket.on('chat-failure', chatFailureHandler)
    
    return () => {
      socket.emit('chat-request', chatid)
      socket.off('chat-info')
      socket.off('chat-exit')
      socket.off('message')
      socket.off('chat-failure')
    }
  }, [])

  const sendMessage = async () => {
    if (input.trim()) {
      const encryptedMessageData = await encryptMessage(input, chatKey)
      const messageData = {
        chatid,
        encryptedMessageData
      }
      socket.emit('message', messageData)
      setInput('')
    }
  }

  const inviteUsers = () => {
    socket.emit('chat-invite', { chatId: chatinfo.chatId, checkedUsers, hostName: loggedin })
  }

  return (
    <div>
      {!loggedin && <button onClick={() => { navigate('/login') }}>login/signup</button>}
      <h1>React with Socket.IO</h1>
      <h2>{chatinfo && chatinfo.chatName}</h2>
      <div>
        {messages.map((msg, idx) => (
          <p key={idx}>{msg.user}: {msg.text}</p>
        ))}
      </div>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type a message..."
      />
      <button onClick={sendMessage}>Send</button>
      {chatinfo && <div>
        <h2>Invite Others: </h2>
        <div style={{ borderStyle: 'inset', display: 'flex', flexDirection: 'column' }}>
          {connectedUsers.filter((user) => !chatinfo.chatUsers.find((chatter) => user.id == chatter.id)).map((user) => {
            return (
              <> {user.username &&
                <div>
                  <input type='checkbox' id={user.id} onChange={(event) => handleCheckUser(event, user)} />
                  <label for={user.id}>{user.username && user.username}</label>
                </div>
              }</>)
          })}
        </div>
        <button onClick={inviteUsers}>Invite</button>
      </div>}
    </div>
  )
}


const stringToArrayBuffer = (str) => {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

const encryptMessage = async (message, key) => {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encodedMessage = stringToArrayBuffer(message);
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, },
    key,
    encodedMessage
  );
  return { ciphertext, iv }
}

