const path = require('path')
const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const formatMessage = require('./utils/message');
const { userJoin,getCurrentUser,userLeave,getRoomUsers } = require('./utils/users');

const app = express();
const server = http.createServer(app);
const io  = socketio(server);

var redis = require('socket.io-redis');
io.adapter(redis({ host: process.env.REDIS_ENDPOINT, port: 6379 }));

app.use(express.static(path.join(__dirname,'public')));
const botName = 'ChatApp';

io.on('connection',socket =>{
    socket.on('joinRoom', ({username,room})=>{
        const user = userJoin(socket.id,username,room);

        socket.join(user.room);
    
        socket.emit('message', formatMessage(botName, `welcome to ${user.room}`));

        socket.broadcast.to(user.room).emit('message',formatMessage(botName,`${user.username} is connected`));

        io.to(user.room).emit('roomUsers',{
            room: user.room,
            users: getRoomUsers(user.room)     
        });

        socket.on('chatMessage',(msg)=>{
            io.emit('message',formatMessage(user.username, msg));
        });

        socket.on('disconnect',() =>{
            const user = userLeave(socket.id);
            if(user){
                io.to(user.room).emit('message',formatMessage(botName,`${user.username} has left the chat`));
            }
            io.to(user.room).emit('roomUsers',{
                room: user.room,
                users: getRoomUsers(user.room)     
            });
        });
    });
});
const PORT = process.argv[2] || 4000;

server.listen(PORT, ()=> console.log(`Server running on port ${PORT}`));
