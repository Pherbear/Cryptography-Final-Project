const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const { writeToUsers, retrieveAccount } = require('./util/writeToUsers')
const bcrypt = require('bcrypt')
const { log } = require('console')
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
const chats = []

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id)

  users.push({id: socket.id, username: '', chatid: ''})
  io.emit('connected-users', users)

  socket.on('message', ({chatid, input, encryptedMessageData}) => {
    console.log('Message received:', input, 'in room: ', chatid)
    const user = users.find((user) => user.id == socket.id)
    console.log(encryptedMessageData)

    const newMsg = {
      chatid,
      id: user.id,
      user: user.username,
      text: input,
      encryptedMessageData 
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

        //signup failure
        io.to(signup.id).emit('login-failure', 'fatal error')

      })
    } else {
      //signup failure
      console.log('failure')
      io.to(signup.id).emit('login-failure', 'username already exists')
    }
  })

  socket.on('disconnect', () => {
    console.log('A user disconnected:' , socket.id)
    const index = users.findIndex((user) => user.id === socket.id)
    const chatid = users[index].chatid
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
      console.log(symmetricKey)
      const chatInfo = {
        chatId,
        chatUsers: [...checkedUsers, host],
        chatName,
        chatKey: symmetricKey
      }
      chats.push(chatInfo)
  
      checkedUsers.map((user) => {
        io.to(user.id).emit('chat-invite', {chatId, hostName: host.username})
      })
  
      io.to(socket.id).emit('chat-start', {chatId})
    }
  })

  socket.on('chat-invite', ({chatId, hostName, checkedUsers}) => {
    const chatInfo = chats.find(chat => chat.chatId === chatId)

    if (chatInfo) {
      chatInfo.chatUsers = [...chatInfo.chatUsers, ...checkedUsers]
      checkedUsers.map((user) => {
        io.to(user.id).emit('chat-invite', {chatId, hostName})
      })
    } else {
      io.to(socket.id).emit('alert-message', 'chat does not exist!')
    }

    io.to(chatId).emit('chat-info', chatInfo)
  })

  socket.on('chat-request', (chatid) => {
    const chatinfo = chats.find((item) => item.chatId = chatid)
    
    if (chatinfo) {
      const user = chatinfo.chatUsers.find(user => {return user.id === socket.id})
      if (user) {
        console.log(user)

        user.chatid = chatid
        io.to(socket.id).emit('chat-info', chatinfo)
        socket.join(chatid)
        io.emit('connected-users', users)

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
  console.log(stringKey)
  return stringKey;
}