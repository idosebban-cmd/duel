/**
 * DotDashSetup — dev/demo entry point for Dot Dash.
 * Create or join a game, then navigate to the lobby.
 */
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useDotDashStore } from '../../store/dotDashStore';
import { useOnboardingStore } from '../../store/onboardingStore';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || window.location.origin;

function makeUserId(name: string) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 16);
  return `${slug}_${Math.random().toString(36).slice(2, 6)}`;
}

export function DotDashSetup() {
  const navigate = useNavigate();
  const [params]  = useSearchParams();
  const store     = useDotDashStore();
  const onboarding = useOnboardingStore();

  const [name,    setName]    = useState(onboarding.name || '');
  const [gameId,  setGameId]  = useState(params.get('join') ?? '');
  const [busy,    setBusy]    = useState(false);
  const [error,   setError]   = useState('');
  const isJoining = !!params.get('join');

  const avatar = onboarding.character
    ? `/characters/${onboarding.character.charAt(0).toUpperCase() + onboarding.character.slice(1)}.png`
    : '/characters/Robot.png';

  const handleCreate = async () => {
    if (!name.trim()) { setError('Enter your name first'); return; }
    const userId = makeUserId(name.trim());
    setBusy(true); setError('');
    try {
      const res  = await fetch(`${SERVER_URL}/api/dotdash/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player1Id:     userId,
          player1Name:   name.trim(),
          player1Avatar: avatar,
          player2Id:     'player2',
          player2Name:   'Opponent',
        }),
      });
      const data = await res.json();
      if (data.gameId) {
        store.setIdentity(userId, name.trim(), avatar);
        navigate(`/dotdash/${data.gameId}/lobby`);
      } else {
        setError(data.error ?? 'Failed to create game');
      }
    } catch { setError('Cannot reach server'); }
    finally  { setBusy(false); }
  };

  const handleJoin = async () => {
    if (!name.trim()) { setError('Enter your name first'); return; }
    if (!gameId.trim()) { setError('Enter a game ID'); return; }
    const userId = makeUserId(name.trim());
    setBusy(true); setError('');
    try {
      const res  = await fetch(`${SERVER_URL}/api/dotdash/${gameId.trim()}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, name: name.trim(), avatar }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed to join'); return; }
      store.setIdentity(userId, name.trim(), avatar);
      navigate(`/dotdash/${gameId.trim()}/lobby`);
    } catch { setError('Cannot reach server'); }
    finally  { setBusy(false); }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-8"
      style={{ background: 'linear-gradient(160deg, #12122A 0%, #1a0a2e 60%, #0a1628 100%)' }}
    >
      {/* Grid */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(78,255,196,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(78,255,196,0.05) 1px,transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      <div className="relative w-full max-w-sm flex flex-col gap-5">
        {/* Title */}
        <motion.div className="text-center" initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-5xl mb-2">🕹️</div>
          <h1 className="font-display font-extrabold text-4xl" style={{
            background: 'linear-gradient(135deg, #4EFFC4, #FF6BA8, #FFE66D)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            DOT DASH
          </h1>
          <p className="font-body text-white/40 text-sm mt-1">
            {isJoining ? "You've been invited to race!" : 'Maze Race · 2 Players'}
          </p>
        </motion.div>

        {/* Name */}
        <motion.div
          className="rounded-2xl p-4 flex flex-col gap-3"
          style={{ background: 'rgba(255,255,255,0.05)', border: '2px solid rgba(255,255,255,0.1)' }}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        >
          <p className="font-display font-bold text-white/70 text-xs uppercase tracking-widest">Your Identity</p>
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (isJoining ? handleJoin() : handleCreate())}
            className="w-full px-4 py-3 rounded-xl font-body text-sm text-charcoal outline-none"
            style={{ border: '3px solid #4EFFC4', background: 'white' }}
          />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden" style={{ border: '2px solid rgba(255,255,255,0.2)' }}>
              <img src={avatar} alt="avatar" className="w-full h-full object-contain" />
            </div>
            <p className="font-body text-white/40 text-xs flex-1">Your character from your profile</p>
          </div>
        </motion.div>

        {/* Create / Join */}
        <motion.div className="flex flex-col gap-3"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        >
          {!isJoining && (
            <>
              <motion.button
                onClick={handleCreate} disabled={busy}
                className="w-full py-4 rounded-2xl font-display font-extrabold text-lg"
                style={{
                  background: busy ? '#374151' : 'linear-gradient(135deg, #4EFFC4, #FFE66D)',
                  border: '4px solid black',
                  color: busy ? '#6b7280' : '#12122A',
                  boxShadow: busy ? 'none' : '8px 8px 0px 0px #B565FF',
                }}
                whileHover={!busy ? { scale: 1.02 } : {}}
                whileTap={!busy ? { scale: 0.97 } : {}}
              >
                {busy ? 'Creating…' : '🎮 Create Game'}
              </motion.button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
                <p className="font-body text-xs text-white/30">or join with a game ID</p>
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
              </div>
            </>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Paste game ID…"
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              className="flex-1 px-4 py-3 rounded-xl font-mono text-sm text-charcoal outline-none"
              style={{ border: '3px solid #FF6BA8', background: 'white' }}
            />
            <motion.button
              onClick={handleJoin} disabled={busy}
              className="px-5 py-3 rounded-xl font-display font-bold text-sm"
              style={{
                background: 'linear-gradient(135deg, #FF6BA8, #B565FF)',
                border: '3px solid black', color: 'white',
                boxShadow: '4px 4px 0 #FFE66D',
              }}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            >
              {isJoining ? '→ Join' : 'Join'}
            </motion.button>
          </div>
        </motion.div>

        {error && (
          <motion.p className="text-center font-body text-sm text-cherry-punch"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          >
            {error}
          </motion.p>
        )}
      </div>
    </div>
  );
}
