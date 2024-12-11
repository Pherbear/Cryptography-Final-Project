const express = require('express')
const fs = require('fs')
const path = require('path')
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

  socket.on('login-request', (login) => {
    console.log(login)

    //login success
    io.to(login.sessionId).emit('login-success', `welcome back, ${login.username}`)
  })

  socket.on('account-create', (signup) => {
    console.log(signup)

    writeToFile(signup)

    //signup success
    io.to(signup.sessionId).emit('login-success', `account successfully created, welcome ${signup.username}`)
  })

  socket.on('disconnect', () => {
    console.log('A user disconnected:' , socket.id)
  })
})

const PORT = 4000
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})

const jsonFilePath = path.join(__dirname, 'users.json')

const writeToFile = (data) => {
  return new Promise((resolve, reject) => {
    let fileData = [];

    // Check if the file exists
    if (fs.existsSync(jsonFilePath)) {
      // Read existing data from the file
      const existingData = fs.readFileSync(jsonFilePath, 'utf8');
      console.log(existingData)
      fileData = existingData ? JSON.parse(existingData) : [];
    }

    fileData.push(data)
    
    fs.writeFile(jsonFilePath, JSON.stringify(fileData, null, 2), (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}