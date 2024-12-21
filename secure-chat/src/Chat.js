import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import forge from 'node-forge'

export default function Chat({ socket, loggedin, connectedUsers, keyPair, digSigKeyPair }) {
  const [messages, setMessages] = useState([])
  const [chatinfo, setChatinfo] = useState()
  const [input, setInput] = useState('')
  const [checkedUsers, setCheckedUsers] = useState([])
  const [chatKey, setChatKey] = useState()
  const [chatUsers, setChatUsers] = useState([])
  const chatKeyRef = useRef(chatKey)
  const chatUsersRef = useRef(chatUsers)

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
        setMessages((prev) => [...prev, { ...msg, text: decryptedMessage }])
      } else {
        setMessages((prev) => [...prev, msg])
      }
    }

    const chatFailureHandler = (error) => {
      alert(error)
    }

    const requestChatInfoHandler = async (info) => {
      setChatinfo(info)

      if (!chatKeyRef.current) {
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

      let newChatUsers = chatUsers
      info.chatUsers.map(async (user) => {
        if (!newChatUsers.includes(i => i.id === user.id)) {
          const digsigkey = await importDigSigKey(user.digsigkey)
          newChatUsers.push({ id: user.id, digsigkey, type: user.digsigkey.type })
        }
      })
      setChatUsers(newChatUsers)
      chatUsersRef.current = newChatUsers
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
      const messageSignature = await signMessage(digSigKeyPair, input)
      const messageData = {
        chatid,
        encryptedMessageData,
        messageSignature
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
          <Message
            msg={msg}
            idx={idx}
            chatinfo={chatinfo}
            chatUsersRef={chatUsersRef}
            setChatUsers={setChatUsers}
            connectedUsers={connectedUsers}

          />
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

const Message = ({ msg, idx, chatUsersRef }) => {
  const [verified, setVerified] = useState(false)

  useEffect(() => {
    const verifyMessage = async () => {
      if (msg.id == '1') setVerified(true)
      else {
        const user = chatUsersRef.current.find(user => user.id === msg.id)
        const {digsigkey, type} = user
        if (await verifySignature(digsigkey, type, msg.text, msg.messageSignature)) {
          setVerified(true)
        }
      }
    }

    if (!verified) verifyMessage()
  }, [])

  return (
    <div>
      <p key={idx}>{msg.user}: {msg.text} {verified ? "✓" : "✕"}</p>
    </div>
  )
}

const verifySignature = async (publicKey, type, message, signatureBase64) => {
  if (type == "RSASSA-PKCS1-v1_5") {
    const messageBuffer = stringToArrayBuffer(message);
    const signatureBuffer = Uint8Array.from(atob(signatureBase64), (c) => c.charCodeAt(0)).buffer;
  
    const isValid = await window.crypto.subtle.verify(
      {
        name: "RSASSA-PKCS1-v1_5",
      },
      publicKey,
      signatureBuffer,
      messageBuffer
    );
  
    return isValid;
  } else if (type == 'DSA') {
    const md = forge.md.sha256.create();
    md.update(message, "utf8");
    const signature = forge.util.decode64(signatureBase64);
    return publicKey.verify(md.digest().bytes(), signature);
  }
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

const base64ToArrayBuffer = (base64) => {
  const binaryString = atob(base64)
  const len = binaryString.length;
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer;
}

const importDigSigKey = async (digsigkey) => {
  const { type } = digsigkey
  
  if (type == 'RSASSA-PKCS1-v1_5') {
    const { base64Key } = digsigkey
    const publicKeyBuffer = base64ToArrayBuffer(base64Key)
    const publicKey = await window.crypto.subtle.importKey(
      "spki", // Format of the exported public key
      publicKeyBuffer,
      {
        name: "RSASSA-PKCS1-v1_5", // Same algorithm used during generation
        hash: { name: "SHA-256" }, // Same hash algorithm used during generation
      },
      true, // Whether the key is extractable
      ["verify"] // Key usage
    );

    return publicKey;
  }

  if (type == 'DSA') {
    const { pem } = digsigkey
    return forge.pki.publicKeyFromPem(pem);
  }
}

const signMessage = async (keyPair, message) => {
  const {type, privateKey} = keyPair
  const messageBuffer = stringToArrayBuffer(message);

  if (type == 'RSASSA-PKCS1-v1_5') {
    // Generate the digital signature
    const signature = await window.crypto.subtle.sign(
      {
        name: "RSASSA-PKCS1-v1_5",
      },
      privateKey,
      messageBuffer
    );
  
    // Convert the signature to Base64 for easier transport
    const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
  
    return signatureBase64;
  } else if (type == 'DSA') {
    const md = forge.md.sha256.create();
    md.update(message, "utf8");
    const signature = privateKey.sign(md);
    return forge.util.encode64(signature);
  }
};
