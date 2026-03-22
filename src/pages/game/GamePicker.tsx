/**
 * Game Picker – choose which game to play (Guess Who or Dot Dash)
 */
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { getMatchById, createChallenge } from '../../lib/database';

interface GameOption {
  id: string;
  name: string;
  imgSrc: string;
  description: string;
  route: string;
  gradient: string;
  color: string;
}

const GAMES: GameOption[] = [
  {
    id: 'guess_who',
    name: 'Guess Who?',
    imgSrc: '/landing-icons/Ghost.png',
    description: 'Ask questions to deduce your opponent\'s secret character. Quick deduction game.',
    route: '/game',
    gradient: 'linear-gradient(135deg, #FF6BA8, #B565FF)',
    color: '#FF6BA8',
  },
  {
    id: 'dot_dash',
    name: 'Dot Dash',
    imgSrc: '/landing-icons/Dot%20Dash.png',
    description: 'Race through a maze collecting dots while avoiding ghosts. Real-time action!',
    route: '/dotdash',
    gradient: 'linear-gradient(135deg, #4EFFC4, #FFE66D)',
    color: '#4EFFC4',
  },
  {
    id: 'word_blitz',
    name: 'Word Blitz',
    imgSrc: '/game-icons/Word%20games.png',
    description: 'Build connecting words from your letters in 3 minutes. Vocabulary & speed!',
    route: '/games/word-blitz',
    gradient: 'linear-gradient(135deg, #B565FF, #FF6BA8)',
    color: '#B565FF',
  },
  {
    id: 'draughts',
    name: 'Draughts',
    imgSrc: '/game-icons/Strategy.png',
    description: 'Classic strategy. Capture all opponent pieces or block their moves to win.',
    route: '/games/draughts',
    gradient: 'linear-gradient(135deg, #FFE66D, #FF9F1C)',
    color: '#FFE66D',
  },
  {
    id: 'connect_four',
    name: 'Connect Four',
    imgSrc: '/game-icons/Boardgames.png',
    description: 'Connect 4 in a row. Strategy meets speed.',
    route: '/games/connect-four',
    gradient: 'linear-gradient(135deg, #4EFFC4, #0099FF)',
    color: '#4EFFC4',
  },
  {
    id: 'battleship',
    name: 'Battleship',
    imgSrc: '/game-icons/Competative%20games.png',
    description: 'Sink their fleet. Strategy and luck.',
    route: '/games/battleship',
    gradient: 'linear-gradient(135deg, #4AC8FF, #0055AA)',
    color: '#4AC8FF',
  },
];

export function GamePicker() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const matchId = (location.state as { matchId?: string } | null)?.matchId;
  const [busy, setBusy] = useState(false);

  const handleGameSelect = async (game: GameOption) => {
    if (!matchId || !user?.id) {
      // No match context — navigate directly to the game route
      navigate(game.route);
      return;
    }

    if (busy) return;
    setBusy(true);

    try {
      const match = await getMatchById(matchId);
      if (!match) {
        navigate(`/match/${matchId}`);
        return;
      }

      const opponentId = match.user_a === user.id ? match.user_b : match.user_a;
      const result = await createChallenge(matchId, user.id, opponentId, game.id);

      if (result.mutual) {
        // Both players challenged each other — go to lobby
        navigate(`/game/${matchId}/lobby?type=${game.id}`);
      } else {
        // Challenge sent — go back to match screen with flash
        navigate(`/match/${matchId}`, { state: { flash: 'Challenge sent!' } });
      }
    } catch (err) {
      console.error('[GamePicker] challenge error:', err);
      navigate(`/match/${matchId}`, { state: { flash: 'Failed to send challenge' } });
    } finally {
      setBusy(false);
    }
  };


  return (
    <div
      className="min-h-screen flex flex-col items-center px-4 py-12 relative overflow-y-auto"
      style={{ background: '#12122A' }}
    >
      {/* Grid bg */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(78,255,196,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(78,255,196,0.06) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Scanlines */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.12) 3px, rgba(0,0,0,0.12) 4px)',
        }}
      />

      <div className="relative z-10 w-full max-w-2xl flex flex-col gap-8">
        {/* Header */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1
            className="font-display font-extrabold text-4xl sm:text-5xl mb-2"
            style={{
              background: 'linear-gradient(135deg, #FF6BA8, #4EFFC4, #FFE66D)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            READY TO PLAY?
          </h1>
          <p className="font-body text-white/60 text-lg">Choose your game</p>
        </motion.div>

        {/* Game options grid */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 gap-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {GAMES.map((game, idx) => (
            <motion.button
              key={game.id}
              onClick={() => handleGameSelect(game)}
              disabled={busy}
              className="group relative rounded-3xl p-6 text-left overflow-hidden transition-all"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '3px solid rgba(255,255,255,0.1)',
              }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 + idx * 0.1, type: 'spring', stiffness: 300, damping: 25 }}
              whileHover={{
                scale: 1.04,
                borderColor: game.color,
                boxShadow: `0 0 30px ${game.color}44, inset 0 0 30px ${game.color}11`,
              }}
              whileTap={{ scale: 0.96 }}
            >
              {/* Gradient background on hover */}
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{ background: game.gradient, opacity: 0 }}
                whileHover={{ opacity: 0.05 }}
                transition={{ duration: 0.3 }}
              />

              {/* Content */}
              <div className="relative flex flex-col h-full gap-4">
                {/* Icon + name */}
                <div className="flex items-center gap-3">
                  <img
                    src={game.imgSrc}
                    alt={game.name}
                    className="w-12 h-12 object-contain flex-shrink-0"
                    draggable={false}
                  />
                  <h2 className="font-display font-extrabold text-2xl text-white">
                    {game.name}
                  </h2>
                </div>

                {/* Description */}
                <p className="font-body text-white/70 text-sm leading-relaxed flex-1">
                  {game.description}
                </p>

                {/* Play button */}
                <motion.div
                  className="flex items-center gap-2 font-display font-bold text-sm uppercase tracking-wide mt-auto"
                  style={{ color: game.color }}
                  whileHover={{ x: 4 }}
                >
                  <span>Play</span>
                  <span>→</span>
                </motion.div>
              </div>

              {/* Border glow on hover */}
              <motion.div
                className="absolute inset-0 rounded-3xl pointer-events-none"
                style={{ border: `3px solid ${game.color}` }}
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
            </motion.button>
          ))}
        </motion.div>

        {/* Bottom section */}
        <motion.div
          className="text-center mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <button
            onClick={() => navigate(matchId ? `/match/${matchId}` : '/discover')}
            className="font-body text-sm text-white/30 hover:text-white/60 transition-colors"
          >
            {matchId ? '\u2190 Back to match' : '\u2190 Back to profiles'}
          </button>
        </motion.div>
      </div>

      {/* Neon bottom bar */}
      <div
        className="fixed bottom-0 left-0 right-0 h-[3px] pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, #FF6BA8, #FFE66D, #4EFFC4, #B565FF, #FF6BA8)',
          boxShadow: '0 0 14px rgba(78,255,196,0.7)',
        }}
      />
    </div>
  );
}
