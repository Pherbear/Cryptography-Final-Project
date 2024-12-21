const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const { writeToUsers, retrieveAccount } = require('./util/writeToUsers')
const bcrypt = require('bcrypt')
const crypto = require('crypto')

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
})

const users = []
const userKeys = new Map()
const userDigSig = new Map()
const userChats = new Map()

const chats = []
const chatKeys = new Map()

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id)

  users.push({id: socket.id, username: ''})
  io.emit('connected-users', users)

  socket.on('message', ({chatid, input, encryptedMessageData, messageSignature}) => {
    const user = users.find((user) => user.id == socket.id)
    const newMsg = {
      chatid,
      id: user.id,
      user: user.username,
      text: input,
      encryptedMessageData,
      messageSignature
    }
    if (!user.username) {
      io.to(socket.id).emit('chat-failure', 'user not logged in!')
    } else {
      io.to(chatid).emit('message', newMsg)
    }

  })

  socket.on('login-request', (login) => {
    const accountInfo = retrieveAccount(login.username)
    if (accountInfo) {
      bcrypt.compare(login.password, accountInfo.password).then((result) => {

        if (result) {
          const user = users.find((user) => user.id === login.id)
          user.username = login.username

          io.emit('connected-users', users)
          io.to(login.id).emit('login-success', login.username)
          console.log(`${socket.id} has logged in as ${login.username}`)

        } else {
          io.to(login.id).emit('login-failure', 'incorrect password')
        }
      })
    } else {
      io.to(login.id).emit('login-failure', `username does not exist`)
    }
  })

  socket.on('public-key', async (publicKey) => {
    const binaryKey = Uint8Array.from(atob(publicKey), (c) => c.charCodeAt(0))
    const importedKey = await crypto.subtle.importKey(
      'spki',
      binaryKey.buffer,
      {name: "RSA-OAEP", hash: "SHA-256"},
      true,
      ["encrypt"]
    )

    const user = users.find((user) => user.id === socket.id)
    if(!user) {
      console.log(socket.id + 'socket not found!!!')
      return
    }
    if (importedKey) {
      userKeys.set(socket.id, importedKey)
    } else {
      console.log('failed to import key!')
    }
  })

  socket.on('digsig-public-key', async (publicKey) => {
    if (publicKey) {
      const user = users.find((user) => user.id === socket.id)
      user.digsigkey = publicKey
      io.emit('connected-users', users)
    } else {
      console.log('failed to import digsig key')
    }
  })

  socket.on('account-create', (signup) => {
    if (!retrieveAccount(signup.username)) {
      bcrypt.hash(signup.password, 10).then((hash) => {

        const newAccountInfo = {
          username: signup.username,
          password: hash,
          accountCreationDate: new Date()
        }
        writeToUsers(newAccountInfo)
        const user = users.find((user) => user.id === signup.id)
        user.username = signup.username
        io.emit('connected-users', users)
        io.to(signup.id).emit('login-success', signup.username)
      }).catch(() => {
        io.to(signup.id).emit('login-failure', 'fatal error')
      })
    } else {
      io.to(signup.id).emit('login-failure', 'username already exists')
    }
  })

  socket.on('disconnect', () => {
    console.log('A user disconnected:' , socket.id)
    const index = users.findIndex((user) => user.id === socket.id)
    const chatid = userChats.get(socket.id)
    const username = users[index].username

    if (chatid) {
      const message = `${username} has disconnected.`
      const messageData = {
        chatid,
        id: '1',
        user: 'server',
        text: message
      }
      io.to(chatid).emit('message', messageData)
    }
    if (index > -1) {
      users.splice(index, 1)
    }
    io.emit('connected-users', users)
  })

  socket.on('create-chat', async ({chatName, checkedUsers}) => {
    const chatId = Math.random().toString(16).slice(2)
    const host = users.find(user => user.id === socket.id)
    let symmetricKey
    try {
      symmetricKey = await generateSymmetricKey()
    } finally {

      const chatInfo = {
        chatId,
        chatUsers: [...checkedUsers, host],
        chatName,
      }
      chats.push(chatInfo)
      chatKeys.set(chatId, symmetricKey)

      checkedUsers.map((user) => {
        io.to(user.id).emit('chat-invite', {chatId, hostName: host.username})
      })
      io.to(socket.id).emit('chat-start', {chatId})
      io.to(socket.id).emit('chat-info', chatInfo)
    }
  })

  socket.on('chat-invite', ({chatId, hostName, checkedUsers}) => {
    const chatInfo = chats.find(chat => chat.chatId === chatId)
    console.log(checkedUsers)

    if (chatInfo) {
      chatInfo.chatUsers = [...chatInfo.chatUsers, ...checkedUsers]
      io.to(chatId).emit('chat-info', chatInfo)
      checkedUsers.map((user) => {
        io.to(user.id).emit('chat-invite', {chatId, hostName})
      })

      const invitationMessage = `${hostName} has invited: [${checkedUsers.map(user => {return ` ${user.username}`})}]`
      const messageData = {
        chatId,
        id: '1',
        user: 'server',
        text: invitationMessage
      }
      io.to(chatId).emit('message', messageData)


    } else {
      io.to(socket.id).emit('alert-message', 'chat does not exist!')
    }
  })

  socket.on('chat-request', async (chatid) => {
    const chatinfo = chats.find((item) => item.chatId = chatid)
    
    if (chatinfo) {
      const user = chatinfo.chatUsers.find(user => {return user.id === socket.id})

      if (user) {
        const userPublicKey = userKeys.get(user.id)
        const chatKey = chatKeys.get(chatid)
        const encryptedKey = await encryptMessage(userPublicKey, chatKey)

        io.to(socket.id).emit('chat-info', {...chatinfo, encryptedKey})
        socket.join(chatid)
        io.emit('connected-users', users)
        userChats.set(user.id, chatid)

        const message = `${user.username} has connected.`
        const messageData = {
          chatid,
          id: '1',
          user: 'server',
          text: message
        }
        io.to(chatid).emit('message', messageData)
      } else {
        io.to(socket.id).emit('chat-exit')
        io.to(socket.id).emit('alert-message', 'no premissions to join chat')
      }
    } else {
      io.to(socket.id).emit('chat-exit')
      io.to(socket.id).emit('alert-message', 'chat info not found')
    }
  })
})

const PORT = 4000
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})

const generateSymmetricKey = async () => {
  const key = crypto.randomBytes(32)
  const stringKey = key.toString('base64')
  return stringKey;
}

//public key encryption
const encryptMessage = async (publicKey, message) => {
  const encoder = new TextEncoder()
  const encodedMessage = encoder.encode(message)
  const encrypted = await crypto.subtle.encrypt(
    {
      name: "RSA-OAEP"
    },
    publicKey,
    encodedMessage
  );
  return encrypted
}