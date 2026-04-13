const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const gamesRouter = require('./routes/games');
const dotDashRouter = require('./routes/dotDash');
const mazeRaceRouter = require('./routes/mazeRace');
const notifyRouter = require('./routes/notify');
const { initFirebase } = require('./services/pushNotifications');
const { createSocketLobbyLogger } = require('./socketLobbyLog');
const { createSocketRoomDebug } = require('./socketRoomDebug');
const { setupGameHandlers } = require('./socket/gameHandlers');
const { setupDotDashHandlers } = require('./socket/dotDashHandlers');
const { setupMazeRaceHandlers } = require('./socket/mazeRaceHandlers');

const socketLobbyLog = createSocketLobbyLogger();
const socketRoomDebug = createSocketRoomDebug();

const PORT = process.env.PORT || 3001;
// When serving from the same origin, CLIENT_URL = self
const CLIENT_URL = process.env.CLIENT_URL || `http://localhost:${PORT}`;

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: false,
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 30000,
    skipMiddlewares: true,
  },
});

app.use(cors({ origin: '*' }));
app.use(express.json());

// API routes
app.use('/api/games',   gamesRouter);
app.use('/api/dotdash', dotDashRouter);
app.use('/api/mazerace', mazeRaceRouter);
app.use('/api/notify',  notifyRouter);
app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date() }));

// Serve built frontend (../dist relative to this file)
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// SPA fallback — all non-API routes serve index.html
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/socket.io')) {
    res.sendFile(path.join(distPath, 'index.html'));
  }
});

// Socket.io game handlers (lobby lifecycle logs → Render via socketLobbyLog)
setupGameHandlers(io, socketLobbyLog);
setupDotDashHandlers(io, socketLobbyLog, socketRoomDebug);
setupMazeRaceHandlers(io, socketLobbyLog, socketRoomDebug);

initFirebase();

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🎮 Duel game server running on port ${PORT}`);
  console.log(`   Serving frontend from: ${distPath}`);
});

module.exports = { app, server, io };
