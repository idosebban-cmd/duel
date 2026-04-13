'use strict';

const admin = require('firebase-admin');
const { getSupabaseAdmin } = require('./supabaseAdmin');

let firebaseInitialized = false;

function initFirebase() {
  if (firebaseInitialized) return true;

  const credJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!credJson) {
    console.warn('[push] FIREBASE_SERVICE_ACCOUNT_JSON not set — push notifications disabled');
    return false;
  }

  try {
    const serviceAccount = JSON.parse(credJson);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    firebaseInitialized = true;
    console.log('[push] Firebase Admin SDK initialized');
    return true;
  } catch (err) {
    console.error('[push] Failed to initialize Firebase Admin:', err.message);
    return false;
  }
}

/**
 * Look up all FCM tokens for a user, send a notification to each,
 * and delete any tokens that FCM reports as invalid.
 */
async function sendPushNotification(userId, title, body, data = {}) {
  if (!initFirebase()) return;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.warn('[push] Supabase admin not available — skipping push');
    return;
  }

  try {
    const { data: tokenRows, error } = await supabase
      .from('push_tokens')
      .select('id, token')
      .eq('user_id', userId);

    if (error) {
      console.error('[push] Failed to fetch tokens for', userId, error.message);
      return;
    }

    if (!tokenRows || tokenRows.length === 0) return;

    const staleIds = [];

    for (const row of tokenRows) {
      try {
        await admin.messaging().send({
          token: row.token,
          notification: { title, body },
          data: Object.fromEntries(
            Object.entries(data).map(([k, v]) => [k, String(v)]),
          ),
          android: {
            priority: 'high',
            notification: { channelId: 'duel_default' },
          },
          apns: {
            payload: {
              aps: { sound: 'default', badge: 1 },
            },
          },
        });
      } catch (sendErr) {
        const code = sendErr?.code ?? sendErr?.errorInfo?.code ?? '';
        if (
          code === 'messaging/invalid-registration-token' ||
          code === 'messaging/registration-token-not-registered'
        ) {
          console.log('[push] Removing stale token', row.id, code);
          staleIds.push(row.id);
        } else {
          console.error('[push] FCM send failed for token', row.id, code, sendErr.message);
        }
      }
    }

    if (staleIds.length > 0) {
      const { error: delErr } = await supabase
        .from('push_tokens')
        .delete()
        .in('id', staleIds);
      if (delErr) {
        console.error('[push] Failed to delete stale tokens:', delErr.message);
      }
    }
  } catch (err) {
    console.error('[push] sendPushNotification error:', err);
  }
}

/**
 * Send push to multiple users (convenience wrapper).
 */
async function sendPushToUsers(userIds, title, body, data = {}) {
  await Promise.allSettled(
    userIds.map((uid) => sendPushNotification(uid, title, body, data)),
  );
}

module.exports = { initFirebase, sendPushNotification, sendPushToUsers };
