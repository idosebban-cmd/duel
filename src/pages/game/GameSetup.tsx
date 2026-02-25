/**
 * GameSetup — development/demo page.
 * In production this screen wouldn't exist: the app would deep-link
 * directly to /game/:gameId/lobby after a match is created server-side.
 *
 * This lets you quickly spin up a game for testing:
 * 1. POST /api/games/create to get a gameId
 * 2. Fill in your userId/name and paste the gameId
 * 3. Click Join → goes to the lobby
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export function GameSetup() {
  const navigate = useNavigate();
  const { setIdentity } = useGameStore();

  const [userId, setUserId] = useState('');
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('🎮');
  const [gameId, setGameId] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  // Quickly create a game on the server and join it as player 1
  const handleCreate = async () => {
    if (!userId || !name) { setError('Enter your user ID and name first'); return; }
    setCreating(true);
    setError('');
    try {
      const res = await fetch(`${SERVER_URL}/api/games/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player1Id: userId,
          player1Name: name,
          player1Avatar: avatar,
          player2Id: 'player2',
          player2Name: 'Opponent',
          player2Avatar: '🎯',
        }),
      });
      const data = await res.json();
      if (data.gameId) {
        setIdentity(userId, name, avatar);
        navigate(`/game/${data.gameId}/lobby`);
      } else {
        setError(data.error ?? 'Failed to create game');
      }
    } catch {
      setError('Cannot reach server. Is it running on port 3001?');
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = () => {
    if (!userId || !name) { setError('Enter your user ID and name first'); return; }
    if (!gameId.trim()) { setError('Enter a game ID'); return; }
    setError('');
    setIdentity(userId, name, avatar);
    navigate(`/game/${gameId.trim()}/lobby`);
  };

  const AVATARS = ['🎮', '🎯', '🃏', '🎲', '🕹️', '🏆', '⚔️', '🔥', '⚡', '🌊', '💎', '🌟'];

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-8"
      style={{ background: 'linear-gradient(160deg, #0f172a 0%, #1e1040 60%, #0f172a 100%)' }}
    >
      <div
        className="absolute inset-0 pointer-events-none opacity-5"
        style={{
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />

      <div className="relative w-full max-w-sm flex flex-col gap-5">
        {/* Title */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1
            className="font-display font-extrabold text-4xl"
            style={{
              background: 'linear-gradient(135deg, #FF6BA8, #B565FF, #00D9FF)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            GUESS WHO?
          </h1>
          <p className="font-body text-white/40 text-sm mt-1">Game Setup</p>
        </motion.div>

        {/* Identity */}
        <motion.div
          className="rounded-2xl p-4 flex flex-col gap-3"
          style={{ background: 'rgba(255,255,255,0.05)', border: '2px solid rgba(255,255,255,0.1)' }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <p className="font-display font-bold text-white/70 text-xs uppercase tracking-widest">
            Your Identity
          </p>

          <input
            type="text"
            placeholder="User ID (e.g. user_alex)"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="w-full px-4 py-3 rounded-xl font-body text-sm text-charcoal outline-none"
            style={{ border: '3px solid #00D9FF', background: 'white' }}
          />

          <input
            type="text"
            placeholder="Display name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl font-body text-sm text-charcoal outline-none"
            style={{ border: '3px solid #B565FF', background: 'white' }}
          />

          <div>
            <p className="font-body text-white/40 text-xs mb-2">Avatar</p>
            <div className="flex flex-wrap gap-2">
              {AVATARS.map((a) => (
                <button
                  key={a}
                  onClick={() => setAvatar(a)}
                  className="w-9 h-9 rounded-xl text-xl flex items-center justify-center transition-all"
                  style={{
                    background: avatar === a ? 'rgba(78,255,196,0.2)' : 'rgba(255,255,255,0.05)',
                    border: avatar === a ? '2px solid #4EFFC4' : '2px solid rgba(255,255,255,0.1)',
                  }}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Create new game */}
        <motion.div
          className="flex flex-col gap-3"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <motion.button
            onClick={handleCreate}
            disabled={creating}
            className="w-full py-4 rounded-2xl font-display font-extrabold text-lg"
            style={{
              background: creating ? '#374151' : 'linear-gradient(135deg, #4EFFC4, #00D9FF)',
              border: '4px solid black',
              color: creating ? '#6b7280' : '#0f172a',
              boxShadow: creating ? 'none' : '8px 8px 0px 0px #B565FF',
            }}
            whileHover={!creating ? { scale: 1.02 } : {}}
            whileTap={!creating ? { scale: 0.97 } : {}}
          >
            {creating ? 'Creating...' : '⚔️ Create New Game'}
          </motion.button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
            <p className="font-body text-xs text-white/30">or join existing</p>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Paste game ID..."
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              className="flex-1 px-4 py-3 rounded-xl font-mono text-sm text-charcoal outline-none"
              style={{ border: '3px solid #FF6BA8', background: 'white' }}
            />
            <motion.button
              onClick={handleJoin}
              className="px-5 py-3 rounded-xl font-display font-bold text-sm"
              style={{
                background: 'linear-gradient(135deg, #FF6BA8, #B565FF)',
                border: '3px solid black',
                color: 'white',
                boxShadow: '4px 4px 0 #FF9F1C',
              }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              Join
            </motion.button>
          </div>
        </motion.div>

        {error && (
          <motion.p
            className="text-center font-body text-sm text-cherry-punch"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {error}
          </motion.p>
        )}

        <p className="text-center font-body text-xs text-white/20">
          Server: {SERVER_URL}
        </p>
      </div>
    </div>
  );
}
