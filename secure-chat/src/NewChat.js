import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

export default function NewChat({ socket, connectedUsers, loggedin }) {
    const [chatName, setChatName] = useState('')
    const [checkedUsers, setCheckedUsers] = useState([])

    const navigate = useNavigate()

    useEffect(() => {
        const handleNewChat = ({chatId}) => {
            navigate(`/chat/${chatId}`)
        }
        socket.on('chat-start', handleNewChat)

        return () => {
            socket.off('chat-start', handleNewChat)
        }
    }, [])

    const handleCheckUser = (event, user) => {
        const checked = event.target.checked
        console.log(checked)

        if (checked) {
            if(!checkedUsers.includes(user)) setCheckedUsers([...checkedUsers, user])
        } else {
            setCheckedUsers(l => l.filter(item => item !== user))
        }
        
        console.log(checkedUsers)
    }

    const handleCreateChat = () => {
        if (chatName === '') {
            alert('chat name required')
            return
        }
        if (checkedUsers.length <= 0) {
            alert('check atleast 1 user')
            return
        }
        if (!loggedin) {
            alert('not logged in!')
            return
        }
        socket.emit('create-chat', {chatName, checkedUsers})
    }
    

  return (
    <div>
        <h1>Create New Chat</h1>
        <label for='chatname'>Chat Name:</label><br/>
        <input type='text' id='chatname' name='chatname' value={chatName} onChange={(e) => setChatName(e.target.value)}/>
        <div>Invite users:</div>
        <div style={{borderStyle: 'inset', display: 'flex', flexDirection: 'column'}}>
            {connectedUsers.filter((user)=> user.id !== socket.id).map((user) => {return (
            <> {user.username && 
                <div>
                    <input type='checkbox' id={user.id} onChange={(event) => handleCheckUser(event, user)}/>
                    <label for={user.id}>{user.username && user.username}</label>
                </div>
            }</>)})}
        </div>
        <button onClick={handleCreateChat}>Create Chat</button>
    </div>
  )
}
