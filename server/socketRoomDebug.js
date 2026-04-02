'use strict';

/**
 * Sampled room membership logs for Render (Dot Dash / Maze Race ticks).
 * Logs when socketCount !== 2 or every SAMPLE_INTERVAL ticks per game.
 */

const SAMPLE_INTERVAL = 40; // ~2s at 20 tps

function describeRoom(io, roomName) {
  const set = io.sockets.adapter.rooms.get(roomName);
  const socketIds = set ? [...set] : [];
  const members = socketIds.map((socketId) => {
    const s = io.sockets.sockets.get(socketId);
    const userId =
      s?.data?.ddUserId ?? s?.data?.mrUserId ?? s?.data?.userId ?? null;
    return { socketId, userId };
  });
  return { room: roomName, socketCount: socketIds.length, members };
}

function createSocketRoomDebug() {
  const ddTickByGame = new Map();
  const mrTickByGame = new Map();

  function bump(map, gameId) {
    const n = (map.get(gameId) ?? 0) + 1;
    map.set(gameId, n);
    return n;
  }

  return {
    logDdGameTickRoom(io, gameId) {
      const room = `dd:${gameId}`;
      const info = describeRoom(io, room);
      const tick = bump(ddTickByGame, gameId);
      if (info.socketCount !== 2 || tick % SAMPLE_INTERVAL === 0) {
        console.log(
          `[SocketRoom] ${JSON.stringify({
            t: new Date().toISOString(),
            game: 'dotdash',
            event: 'dd_game_tick_room',
            gameId,
            tick,
            ...info,
          })}`,
        );
      }
    },
    logMrTickRoom(io, gameId) {
      const room = `mr:${gameId}`;
      const info = describeRoom(io, room);
      const tick = bump(mrTickByGame, gameId);
      if (info.socketCount !== 2 || tick % SAMPLE_INTERVAL === 0) {
        console.log(
          `[SocketRoom] ${JSON.stringify({
            t: new Date().toISOString(),
            game: 'mazerace',
            event: 'mr_tick_room',
            gameId,
            tick,
            ...info,
          })}`,
        );
      }
    },
  };
}

const noopSocketRoomDebug = {
  logDdGameTickRoom() {},
  logMrTickRoom() {},
};

module.exports = { createSocketRoomDebug, noopSocketRoomDebug };
