const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const gamesRouter = require('./routes/games');
const { setupGameHandlers } = require('./socket/gameHandlers');

const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [CLIENT_URL, 'https://*.netlify.app'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 30000, // 30s grace period
    skipMiddlewares: true,
  },
});

app.use(cors({ origin: [CLIENT_URL, 'https://*.netlify.app'], credentials: true }));
app.use(express.json());

// Routes
app.use('/api/games', gamesRouter);
app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date() }));

// Socket.io game handlers
setupGameHandlers(io);

server.listen(PORT, () => {
  console.log(`🎮 Duel game server running on port ${PORT}`);
  console.log(`   Allowing connections from: ${CLIENT_URL}`);
});

module.exports = { app, server, io };
