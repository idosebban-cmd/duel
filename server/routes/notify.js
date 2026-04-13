'use strict';

const express = require('express');
const router = express.Router();
const { getSupabaseAdmin } = require('../services/supabaseAdmin');
const { sendPushNotification, sendPushToUsers } = require('../services/pushNotifications');

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';

function verifyWebhook(req, res, next) {
  if (!WEBHOOK_SECRET) {
    console.warn('[notify] WEBHOOK_SECRET not set — accepting all webhook calls');
    return next();
  }
  const token = req.headers['x-webhook-secret'] || req.query.secret;
  if (token !== WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

async function getDisplayName(userId) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return 'Someone';
  try {
    const { data } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', userId)
      .maybeSingle();
    return data?.name || 'Someone';
  } catch {
    return 'Someone';
  }
}

// ── New match created ──────────────────────────────────────────────────────
// Supabase webhook fires on INSERT into matches table.
// Payload: { type: 'INSERT', record: { id, user_a, user_b, ... } }
router.post('/match-created', verifyWebhook, async (req, res) => {
  try {
    console.log('[notify/match-created] Received body:', JSON.stringify(req.body, null, 2));
    const record = req.body?.record;
    if (!record) {
      console.error('[notify/match-created] Missing record in body. Keys:', Object.keys(req.body || {}));
      return res.status(400).json({ error: 'Missing record' });
    }

    const { id: matchId, user_a, user_b } = record;
    if (!user_a || !user_b) {
      console.error('[notify/match-created] Missing users. record keys:', Object.keys(record), 'record:', JSON.stringify(record));
      return res.status(400).json({ error: 'Missing users' });
    }

    const [nameA, nameB] = await Promise.all([
      getDisplayName(user_a),
      getDisplayName(user_b),
    ]);

    await Promise.allSettled([
      sendPushNotification(user_a, 'New Match!', `You matched with ${nameB}!`, {
        screen: 'match',
        matchId,
      }),
      sendPushNotification(user_b, 'New Match!', `You matched with ${nameA}!`, {
        screen: 'match',
        matchId,
      }),
    ]);

    res.json({ ok: true });
  } catch (err) {
    console.error('[notify/match-created]', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// ── Turn changed (game updated) ───────────────────────────────────────────
// Supabase webhook fires on UPDATE of games table when current_turn changes.
// Payload: { type: 'UPDATE', record: { id, match_id, current_turn, player1_id, player2_id, game_type, status, winner } }
router.post('/turn-changed', verifyWebhook, async (req, res) => {
  try {
    console.log('[notify/turn-changed] Received body:', JSON.stringify(req.body, null, 2));
    const record = req.body?.record;
    const oldRecord = req.body?.old_record;
    if (!record) {
      console.error('[notify/turn-changed] Missing record in body. Keys:', Object.keys(req.body || {}));
      return res.status(400).json({ error: 'Missing record' });
    }

    const { match_id, current_turn, player1_id, player2_id, status, winner, game_type } = record;

    if (winner || status === 'finished' || status === 'abandoned') {
      return res.json({ ok: true, skipped: 'game_over' });
    }

    if (!current_turn) {
      return res.json({ ok: true, skipped: 'no_current_turn' });
    }

    if (oldRecord && oldRecord.current_turn === current_turn) {
      return res.json({ ok: true, skipped: 'turn_unchanged' });
    }

    const opponentId = current_turn === player1_id ? player2_id : player1_id;
    const opponentName = await getDisplayName(opponentId);

    const gameLabel = formatGameType(game_type);

    await sendPushNotification(
      current_turn,
      'Your Turn!',
      `${opponentName} made a move in ${gameLabel}`,
      { screen: 'match', matchId: match_id },
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('[notify/turn-changed]', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// ── Chat message sent ─────────────────────────────────────────────────────
// Supabase webhook fires on INSERT into messages table.
// Payload: { type: 'INSERT', record: { id, room_id, sender, content, ... } }
router.post('/chat-message', verifyWebhook, async (req, res) => {
  try {
    console.log('[notify/chat-message] Received body:', JSON.stringify(req.body, null, 2));
    const record = req.body?.record;
    if (!record) {
      console.error('[notify/chat-message] Missing record in body. Keys:', Object.keys(req.body || {}));
      return res.status(400).json({ error: 'Missing record' });
    }

    const { room_id: matchId, sender, content } = record;
    if (!matchId || !sender) return res.status(400).json({ error: 'Missing fields' });

    const supabase = getSupabaseAdmin();
    if (!supabase) return res.status(500).json({ error: 'No supabase' });

    const { data: match } = await supabase
      .from('matches')
      .select('user_a, user_b')
      .eq('id', matchId)
      .maybeSingle();

    if (!match) return res.status(404).json({ error: 'Match not found' });

    const recipientId = match.user_a === sender ? match.user_b : match.user_a;
    const senderName = await getDisplayName(sender);

    const preview = content && content.length > 80
      ? content.slice(0, 77) + '...'
      : (content || 'Sent a message');

    await sendPushNotification(
      recipientId,
      senderName,
      preview,
      { screen: 'match', matchId },
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('[notify/chat-message]', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

function formatGameType(gameType) {
  if (!gameType) return 'a game';
  const labels = {
    guess_who: 'Guess Who',
    connect_four: 'Connect Four',
    battleship: 'Battleship',
    hangman: 'Hangman',
    word_blitz: 'Word Blitz',
    'dot-dash': 'Dot Dash',
    dot_dash: 'Dot Dash',
    'maze-race': 'Maze Race',
    maze_race: 'Maze Race',
    draughts: 'Draughts',
  };
  return labels[gameType] || gameType.replace(/_/g, ' ');
}

module.exports = router;
