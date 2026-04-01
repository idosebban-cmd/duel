import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Gamepad2 } from '../ui/Icons';
import { useAuthStore } from '../../store/authStore';
import { useOnboardingStore, ONBOARDING_PROGRESS_DOTS } from '../../store/onboardingStore';
import { persistOnboardingProfile } from '../../lib/database';
import { ProfileDetailSheet, type ProfileDetailData } from '../profile/ProfileDetailSheet';

export function PlayerCardPreview() {
  const navigate = useNavigate();
  const store = useOnboardingStore();
  const markOnboardingCompleteAndClearDraft = useOnboardingStore((s) => s.markOnboardingCompleteAndClearDraft);
  const { user } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const previewProfile: ProfileDetailData = {
    id: user?.id ?? '',
    name: store.name || 'Player',
    age: store.age ?? 0,
    location: store.location || '',
    character: store.character ?? 'ghost',
    element: store.element ?? 'fire',
    affiliation: store.affiliation ?? 'city',
    bio: store.bio || '',
    games: store.gameTypes,
    favoriteGames: store.favoriteGames,
    relationshipGoals: store.lookingFor,
    intent: store.intent,
    gender: store.gender,
    interestedIn: store.interestedIn,
    birthday: store.birthday,
    kids: store.kids ?? '',
    drinking: store.drinking ?? '',
    smoking: store.smoking ?? '',
    cannabis: store.cannabis ?? '',
    pets: store.pets ?? '',
    exercise: store.exercise ?? '',
    prompts: store.userPrompts,
  };

  const handleNext = async () => {
    if (!user?.id) {
      setSaveError('You are not signed in. Go back to sign up.');
      return;
    }
    const email = user.email?.trim() ?? '';
    if (!email) {
      setSaveError('Your account has no email on file. Please contact support.');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await persistOnboardingProfile(user.id, email, store);
      store.completeStep(7);
      markOnboardingCompleteAndClearDraft();
      navigate('/discover');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save profile.';
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden" style={{ background: '#12122A' }}>
      {/* Grid + scanlines (match other onboarding steps) */}
      <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(78,255,196,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(78,255,196,0.06) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.12) 3px, rgba(0,0,0,0.12) 4px)' }} />

      {/* z-[60] above ProfileDetailSheet (z-30): sole Back control for this step */}
      <div className="fixed left-0 right-0 top-0 z-[60] flex items-center gap-3 px-4 py-4 sm:px-6" style={{ background: 'rgba(18,18,42,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <motion.button onClick={() => navigate('/onboarding/prompts')} className="flex flex-shrink-0 items-center gap-1.5 font-body font-medium text-ui-body" style={{ color: 'rgba(255,255,255,0.55)' }} whileHover={{ x: -2 }} whileTap={{ scale: 0.95 }}>
          <ArrowLeft size={24} /><span>Back</span>
        </motion.button>
        <div className="flex flex-1 flex-col items-center gap-1.5">
          <span className="font-body text-ui-label font-bold uppercase tracking-widest" style={{ color: '#4EFFC4' }}>Player Card</span>
          <div className="flex gap-1">
            {ONBOARDING_PROGRESS_DOTS.map((i) => (
              <div key={i} className="h-1.5 rounded-full" style={{ width: i === 10 ? 24 : 8, background: '#FF6BA8' }} />
            ))}
          </div>
        </div>
        <div className="w-14 flex-shrink-0" />
      </div>

      {/* Full profile preview (same component as Discover detail); header hidden — use fixed bar above */}
      <ProfileDetailSheet
        profile={previewProfile}
        photoUrls={store.photos.length > 0 ? store.photos : undefined}
        hideHeaderNavigation
        onClose={() => navigate('/onboarding/prompts')}
      />

      {/* z-50 above sheet: primary actions */}
      <div className="fixed bottom-0 left-0 right-0 z-50 px-4 py-5 sm:px-6" style={{ background: 'linear-gradient(to top, #12122A 70%, transparent)' }}>
        <div className="mx-auto max-w-lg space-y-3">
          {saveError && (
            <p className="mb-2 text-center font-body text-ui-body" style={{ color: '#FF6BA8' }}>{saveError}</p>
          )}
          <motion.button
            onClick={() => void handleNext()}
            disabled={saving}
            className={`relative w-full overflow-hidden rounded-2xl px-8 py-5 font-display font-extrabold text-xl text-white sm:text-2xl ${saving ? 'pointer-events-none cursor-not-allowed opacity-40' : ''}`}
            style={{
              background: 'linear-gradient(135deg, #FF6BA8 0%, #FF3D71 100%)',
              border: '4px solid black',
              boxShadow: '8px 8px 0px 0px #B565FF',
              textShadow: '2px 2px 0 rgba(0,0,0,0.2)',
            }}
            whileHover={saving ? {} : { scale: 1.03, boxShadow: '12px 12px 0px 0px #B565FF' }}
            whileTap={saving ? {} : { scale: 0.97, boxShadow: '4px 4px 0px 0px #B565FF' }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/30 to-transparent" />
            <span className="flex items-center justify-center gap-2">
              <Gamepad2 size={24} />
              {saving ? 'SAVING…' : 'LOOKS GOOD, NEXT'}
            </span>
          </motion.button>

          <motion.button
            onClick={() => navigate('/onboarding/avatar')}
            className="w-full rounded-2xl px-8 py-3 font-display font-bold text-base"
            style={{ background: 'rgba(255,255,255,0.07)', border: '2px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)' }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Edit Profile
          </motion.button>
        </div>
      </div>

      <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-[55] h-[3px]" style={{ background: 'linear-gradient(90deg, #FF6BA8, #FFE66D, #4EFFC4, #B565FF, #FF6BA8)', boxShadow: '0 0 14px rgba(78,255,196,0.7)' }} />
    </div>
  );
}
