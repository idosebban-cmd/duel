/**
 * Shared multiplayer overlays for all game screens:
 * - WaitingForOpponentOverlay (Rule 1): shown until both players present
 * - LeaveGameDialog (Rule 2+3): confirmation before abandoning
 * - OpponentLeftOverlay (Rule 4): shown when opponent forfeits
 * - useOpponentLeftRedirect: auto-navigate after forfeit
 * - useBeforeUnload: browser close warning during active play
 */

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

// ── Rule 1: Waiting for opponent to load ──────────────────────────────────────

interface WaitingOverlayProps {
  visible: boolean;
  opponentName?: string;
  matchId: string;
}

export function WaitingForOpponentOverlay({ visible, opponentName, matchId }: WaitingOverlayProps) {
  const navigate = useNavigate();
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());

  useEffect(() => {
    if (!visible) { setElapsed(0); startRef.current = Date.now(); return; }
    const id = setInterval(() => {
      const s = Math.floor((Date.now() - startRef.current) / 1000);
      setElapsed(s);
      if (s >= 30) {
        clearInterval(id);
        navigate(`/match/${matchId}`, {
          state: { flash: 'Game cancelled — opponent didn\'t load in time.' },
        });
      }
    }, 1000);
    return () => clearInterval(id);
  }, [visible, matchId, navigate]);

  if (!visible) return null;

  return (
    <motion.div
      className="fixed inset-0 flex flex-col items-center justify-center gap-6 z-50"
      style={{ background: 'rgba(0,0,0,0.85)' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
    >
      <motion.div
        className="w-12 h-12 rounded-full border-4 border-t-transparent"
        style={{ borderColor: '#4EFFC4', borderTopColor: 'transparent' }}
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />
      <div className="text-center">
        <p className="font-display text-xl" style={{ color: '#4EFFC4' }}>
          Waiting for {opponentName ?? 'opponent'}...
        </p>
        <p className="font-body text-sm mt-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {elapsed}s / 30s
        </p>
      </div>
    </motion.div>
  );
}

// ── Rule 2+3: Leave game confirmation dialog ──────────────────────────────────

interface LeaveDialogProps {
  visible: boolean;
  opponentName?: string;
  onStay: () => void;
  onLeave: () => void;
}

export function LeaveGameDialog({ visible, opponentName, onStay, onLeave }: LeaveDialogProps) {
  if (!visible) return null;

  return (
    <motion.div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.85)' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
    >
      <motion.div
        className="w-full max-w-xs rounded-2xl px-6 py-6 text-center"
        style={{ background: 'linear-gradient(175deg,#1C1C3E,#12122A)', border: '2px solid rgba(255,255,255,0.1)' }}
        initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      >
        <h2 className="font-display text-2xl mb-2" style={{ color: '#FFE66D' }}>
          Leave game?
        </h2>
        <p className="font-body text-sm mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>
          You'll forfeit and {opponentName ?? 'your opponent'} wins.
        </p>
        <button
          onClick={onStay}
          className="w-full py-3 rounded-xl font-display text-base mb-3"
          style={{
            background: 'linear-gradient(135deg,#4EFFC4,#00D9FF)',
            color: '#1a1a2e',
            border: '3px solid rgba(255,255,255,0.2)',
          }}
        >
          Stay
        </button>
        <button
          onClick={onLeave}
          className="w-full py-3 rounded-xl font-display text-base"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '2px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.5)',
          }}
        >
          Leave
        </button>
      </motion.div>
    </motion.div>
  );
}

// ── Rule 4: Opponent left / forfeit overlay ───────────────────────────────────

interface OpponentLeftProps {
  visible: boolean;
  opponentName?: string;
}

export function OpponentLeftOverlay({ visible, opponentName }: OpponentLeftProps) {
  if (!visible) return null;

  return (
    <motion.div
      className="fixed inset-0 flex flex-col items-center justify-center p-6 z-50"
      style={{ background: 'rgba(0,0,0,0.92)' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
    >
      <motion.div
        className="w-full max-w-sm rounded-3xl px-6 py-8 text-center"
        style={{
          background: 'linear-gradient(175deg,#1C1C3E,#12122A)',
          border: '2px solid rgba(255,255,255,0.1)',
          boxShadow: '0 0 60px rgba(78,255,196,0.25)',
        }}
        initial={{ scale: 0.7, y: 40 }} animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      >
        <motion.div
          className="font-display text-4xl mb-2"
          style={{ color: '#4EFFC4', textShadow: '0 0 30px rgba(78,255,196,0.9)' }}
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        >
          YOU WIN!
        </motion.div>
        <p className="font-body text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {opponentName ?? 'Opponent'} left the game.
        </p>
      </motion.div>
    </motion.div>
  );
}

// ── Reconnect grace period overlay ────────────────────────────────────────────

interface ReconnectOverlayProps {
  visible: boolean;
  opponentName?: string;
}

export function ReconnectOverlay({ visible, opponentName }: ReconnectOverlayProps) {
  if (!visible) return null;

  return (
    <motion.div
      className="fixed inset-0 flex flex-col items-center justify-center gap-6 z-50"
      style={{ background: 'rgba(0,0,0,0.85)' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
    >
      <motion.div
        className="w-12 h-12 rounded-full border-4 border-t-transparent"
        style={{ borderColor: '#FFE66D', borderTopColor: 'transparent' }}
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />
      <p className="font-display text-lg text-center" style={{ color: '#FFE66D' }}>
        Waiting for {opponentName ?? 'opponent'} to reconnect...
      </p>
    </motion.div>
  );
}

// ── Hook: reconnect grace period (15s) + forfeit detection ───────────────────

export function useReconnectGrace(
  isMultiplayer: boolean,
  bothPresent: boolean,
  opponentLeft: boolean,
  gamePhase: string,
  /** Phase values that mean "game is over" — skip grace logic */
  resultPhase: string = 'result',
) {
  const [graceActive, setGraceActive] = useState(false);
  const [showForfeit, setShowForfeit] = useState(false);
  const prevBothPresentRef = useRef(false);
  const graceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isMultiplayer || gamePhase === resultPhase) {
      prevBothPresentRef.current = bothPresent;
      return;
    }

    // If opponent abandoned, skip grace and show forfeit immediately
    if (opponentLeft) {
      if (graceTimerRef.current) { clearTimeout(graceTimerRef.current); graceTimerRef.current = null; }
      setGraceActive(false);
      setShowForfeit(true);
      prevBothPresentRef.current = bothPresent;
      return;
    }

    // Detect transition: bothPresent was true → now false (opponent dropped)
    if (prevBothPresentRef.current && !bothPresent && !showForfeit) {
      setGraceActive(true);
      graceTimerRef.current = setTimeout(() => {
        graceTimerRef.current = null;
        // Timer expired without recovery or abandon — dismiss grace overlay
        // (polling will eventually pick up the abandon status)
        setGraceActive(false);
      }, 15000);
    }

    // Opponent reconnected during grace period
    if (bothPresent && graceActive) {
      if (graceTimerRef.current) { clearTimeout(graceTimerRef.current); graceTimerRef.current = null; }
      setGraceActive(false);
    }

    prevBothPresentRef.current = bothPresent;
  }, [isMultiplayer, bothPresent, opponentLeft, gamePhase, resultPhase, graceActive, showForfeit]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { if (graceTimerRef.current) clearTimeout(graceTimerRef.current); };
  }, []);

  return { graceActive, showForfeit };
}

// ── Hook: auto-redirect after opponent forfeits ──────────────────────────────

export function useOpponentLeftRedirect(
  opponentLeft: boolean,
  matchId: string | null,
  opponentName?: string,
) {
  const navigate = useNavigate();
  const firedRef = useRef(false);

  useEffect(() => {
    if (!opponentLeft || !matchId || firedRef.current) return;
    firedRef.current = true;
    const timer = setTimeout(() => {
      navigate(`/match/${matchId}`, {
        state: { flash: `You won — ${opponentName ?? 'opponent'} forfeited.` },
      });
    }, 4000);
    return () => clearTimeout(timer);
  }, [opponentLeft, matchId, opponentName, navigate]);
}

// ── Hook: beforeunload warning ───────────────────────────────────────────────

export function useBeforeUnload(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [active]);
}
