const path = require('path');
const http = require('http');
const express = require('express');
const { generateMessage, generateLocationMessage } = require('./utils/messages');
const socketio = require('socket.io')
const Filter = require('bad-words');
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const port = process.env.PORT || 3000;
// Configure settings for Express server
const publicDirectoryPath = path.join(__dirname, '../public');

//Serve up public folder
app.use(express.static(publicDirectoryPath));

// const message = 'It worked';


 io.on('connection', (socket) => { // socket is an object that contains info about that connection 
    console.log('New WebSocket Connection')

    socket.on('join', (options, callback) => {
        const { error, user } =  addUser({ id: socket.id, ...options})

        if (error){
           return callback(error)
        }

        socket.join(user.room)

        socket.emit('message', generateMessage('Admin', 'Welcome'));
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined`))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })
       
        callback();
    })

    socket.on('sendMessage', (inputText, callback) => {
        const filter = new Filter();

        if ( filter.isProfane(inputText) ) {
            return callback('Profanity is not allowed')
        }

        const user = getUser(socket.id);

        io.to(user.room).emit('message', generateMessage(user.username, inputText));
        callback('Delivered')
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id);

        if (user){
            io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left the chat!`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })

    socket.on('sendLocation', (coordinates, callback) => {
        const user = getUser(socket.id);


        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps/?q=${coordinates.lat},${coordinates.long}`))
        callback('Coordinates delivered');
    })

   
})

server.listen(port, () => {
    console.log(`Server is listening on ${port}`);
})