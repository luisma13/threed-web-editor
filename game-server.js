const express = require('express');
const app = express();
const http = require('http').Server(app);

const io = require('socket.io')(http, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});

app.use(express.static('../dist/'));

app.get('/', function (req, res) {
    res.sendFile(__dirname + '../../dist/index.html');
});

let players = {};

(() => {
    setup();

    // Update player position, roughly matches 120 refresh
    setInterval(function () {
        io.sockets.emit('playerPositions', players);
    }, 1000 / 120);
})();

function setup() {

    io.on('connection', function (socket) {
        // Client connect...
        console.log(`User ${socket.id} connected`);

        // Add to server players object
        players[socket.id] = {
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: [0, 0, 0],
            action: "Idle"
        };

        // We give all clients notice of new player and their ID..
        socket.broadcast.emit(
            'player connect',
            socket.id,
            io.engine.clientsCount
        );

        // We give client their ID, playerCount and playerIDs
        socket.emit(
            'initPlayer',
            { id: socket.id },
            io.engine.clientsCount,
            Object.keys(players)
        );

        // We give clients notice of disconnection and the their ID
        socket.on('disconnect', function () {
            console.log(`User ${socket.id} disconnected`);
            socket.broadcast.emit(
                'player disconnect',
                socket.id,
                io.engine.clientsCount
            );
            // Delete from players object
            delete players[socket.id];
        });

        // Data every client uploads
        socket.on('updateClientPos', (position, rotation, action) => {
            if (players[socket.id]) {
                players[socket.id].position = position;
                players[socket.id].rotation = rotation;
                players[socket.id].action = action;
            }
        });

    });

    let port = process.env.PORT;
    if (port == null || port == '') {
        port = 3000;
    }

    http.listen(port, function () {
        console.log(`Listening on port ${port}`);
    });
}