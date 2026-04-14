import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

function getDataString(data: unknown, key: string): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const v = (data as Record<string, unknown>)[key];
  if (typeof v === 'string') return v;
  if (v != null && typeof v !== 'object') return String(v);
  return undefined;
}

function navigateFromPayload(
  navigate: ReturnType<typeof useNavigate>,
  data: unknown,
): void {
  const screen = getDataString(data, 'screen');
  const matchId = getDataString(data, 'matchId');
  if (screen === 'match' && matchId) {
    navigate(`/match/${matchId}`, { replace: true });
    return;
  }
  if (screen === 'matches') {
    navigate('/matches', { replace: true });
    return;
  }
  navigate('/matches', { replace: true });
}

async function upsertPushToken(userId: string, token: string): Promise<void> {
  const platform = Capacitor.getPlatform();
  if (platform !== 'ios' && platform !== 'android') return;
  try {
    const { error } = await supabase.from('push_tokens').upsert(
      { user_id: userId, token, platform },
      { onConflict: 'user_id,token' },
    );
    if (error) console.error('[push] upsert push_tokens failed', error);
  } catch (e) {
    console.error('[push] upsert push_tokens', e);
  }
}

/**
 * Native-only: registers for push, upserts device token to `push_tokens` when signed in,
 * foreground receive (no UI), tap → `/matches` or `/match/:matchId` via data keys `screen`, `matchId`.
 */
export function usePushNotifications(): void {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const tokenRef = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  const navigateRef = useRef(navigate);

  useEffect(() => {
    userIdRef.current = user?.id ?? null;
  }, [user?.id]);

  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let cancelled = false;
    const listenerPromises: Promise<PluginListenerHandle>[] = [];

    listenerPromises.push(
      PushNotifications.addListener('registration', (t) => {
        tokenRef.current = t.value;
        const uid = userIdRef.current;
        if (uid) void upsertPushToken(uid, t.value);
      }),
    );

    listenerPromises.push(
      PushNotifications.addListener('registrationError', (err) => {
        console.error('[push] registrationError', err.error);
      }),
    );

    listenerPromises.push(
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        if (import.meta.env.DEV) {
          console.debug('[push] foreground', notification.id, notification.title);
        }

        const data = notification.data as Record<string, unknown> | undefined;
        const type = data && typeof data.type === 'string' ? data.type : undefined;

        if (type === 'chat_message') {
          const matchId = getDataString(data, 'matchId');
          window.dispatchEvent(
            new CustomEvent('foreground-push', {
              detail: {
                type,
                title: notification.title ?? '',
                body: notification.body ?? '',
                matchId,
              },
            }),
          );
        }
      }),
    );

    listenerPromises.push(
      PushNotifications.addListener('pushNotificationActionPerformed', (event) => {
        navigateFromPayload(navigateRef.current, event.notification?.data);
      }),
    );

    const run = async () => {
      try {
        const perm = await PushNotifications.requestPermissions();
        if (cancelled) return;
        if (perm.receive !== 'granted') {
          console.warn('[push] permission not granted:', perm.receive);
          return;
        }
        await PushNotifications.register();
      } catch (e) {
        console.error('[push] setup failed', e);
      }
    };

    void run();

    return () => {
      cancelled = true;
      void Promise.all(listenerPromises).then((handles) => {
        for (const h of handles) {
          void h.remove();
        }
      });
    };
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const uid = user?.id;
    const token = tokenRef.current;
    if (!uid || !token) return;
    void upsertPushToken(uid, token);
  }, [user?.id]);
}
