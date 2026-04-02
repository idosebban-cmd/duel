'use strict';

/**
 * Structured one-line logs for Render (grep-friendly JSON suffix).
 * @param {'guesswho'|'dotdash'|'mazerace'} game
 */
function logEvent(game, event, payload) {
  const entry = {
    t: new Date().toISOString(),
    game,
    event,
    ...payload,
  };
  console.log(`[SocketLobby] ${JSON.stringify(entry)}`);
}

function createSocketLobbyLogger() {
  return {
    playerJoinLobby(game, payload) {
      logEvent(game, 'player_join_lobby', payload);
    },
    playerReady(game, payload) {
      logEvent(game, 'player_ready', payload);
    },
    bothReadyGameStarting(game, payload) {
      logEvent(game, 'both_ready_game_starting', payload);
    },
    playerDisconnect(game, payload) {
      logEvent(game, 'player_disconnect', payload);
    },
    playerReconnect(game, payload) {
      logEvent(game, 'player_reconnect', payload);
    },
  };
}

/** For tests or callers that omit the logger. */
const noopSocketLobbyLog = {
  playerJoinLobby() {},
  playerReady() {},
  bothReadyGameStarting() {},
  playerDisconnect() {},
  playerReconnect() {},
};

module.exports = { createSocketLobbyLogger, noopSocketLobbyLog };
