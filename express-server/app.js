const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const { writeToUsers, retrieveAccount } = require('./util/writeToUsers')
const bcrypt = require('bcrypt')
const { log } = require('console')

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

  users.push({id: socket.id, username: ''})
  io.emit('connected-users', users)

  socket.on('message', (msg) => {
    console.log('Message received:', msg)
    const user = users.find((user) => user.id == socket.id)

    const newMsg = {
      id: user.id,
      user: user.username,
      text: msg
    }

    if (!user.username) {
      io.emit('chat-failure', 'user not logged in!')
    } else {
      io.emit('message', newMsg)
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
    if (index > -1) {
      users.splice(index, 1)
    }
    io.emit('connected-users', users)
  })

  socket.on('create-chat', ({chatName, checkedUsers}) => {
    const chatId = Math.random().toString(16).slice(2)
    const host = users.find(user => user.id === socket.id)
  
    const chatInfo = {
      chatId,
      chatUsers: [...checkedUsers, host],
      chatName
    }
    chats.push(chatInfo)

    checkedUsers.map((user) => {
      io.to(user.id).emit('chat-invite', {chatId})
    })

    io.to(socket.id).emit('chat-start', {chatId})
  })

  socket.on('chat-info-request', (chatid) => {
    const chatinfo = chats.find((item) => item.chatId = chatid)
    io.to(socket.id).emit('chat-info', chatinfo)
  })
})

const PORT = 4000
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})

