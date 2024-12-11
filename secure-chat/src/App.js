import React, { useEffect, useState } from 'react'
import { io } from 'socket.io-client';
import Chat from './Chat';
import Login from './Login';
import { BrowserRouter, Routes, Route } from 'react-router'
import Signup from './Signup';

const socket = io('http://localhost:4000')

function App() {
  return (
    <div>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Chat socket={socket}/>}/>
          <Route path="/login" element={<Login socket={socket}/>}/>
          <Route path="/signup" element={<Signup socket={socket}/>}/>
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
