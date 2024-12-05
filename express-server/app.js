const express = require('express')
const http = require('http')
const { Server } = require('socket.io')

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
})

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id)

  socket.on('message', (msg) => {
    console.log('Message received:', msg)

    io.emit('message', `Server: ${msg}`)
  })

  socket.on('disconnect', () => {
    console.log('A user disconnected:' , socket.id)
  })
})

const PORT = 4000
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})