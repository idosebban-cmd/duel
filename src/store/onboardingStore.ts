import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const loadSessionPhotos = (): string[] => {
  try {
    const raw = sessionStorage.getItem('duel-photos');
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
};

export interface UserPrompt {
  id: number;
  category: 'games' | 'fun' | 'personality' | 'playful';
  icon: string;
  question: string;
  answer: string;
}

export interface OnboardingState {
  // Auth
  userId: string | null;

  // Avatar
  character: string | null;
  element: string | null;
  affiliation: string | null;

  // Basics
  name: string;
  birthday: string | null; // ISO string for localStorage compatibility
  age: number | null;
  gender: 'woman' | 'man' | 'non-binary' | null;
  interestedIn: 'men' | 'women' | 'everyone' | null;
  location: string;
  latitude: number | null;
  longitude: number | null;

  // Bio
  bio: string;

  // Photos
  photos: string[]; // base64 data URLs for persistence

  // Games
  gameTypes: string[];
  favoriteGames: string[];

  // Intent (Just Play feature)
  intent: 'romance' | 'play' | 'both';

  // Relationship
  lookingFor: string[];

  // Preferences
  preferredAgeMin: number;
  preferredAgeMax: number;
  preferredDistance: number | null; // null = anywhere

  // Lifestyle
  kids: string | null;
  drinking: string | null;
  smoking: string | null;
  cannabis: string | null;
  pets: string | null;
  exercise: string | null;

  // Prompts
  userPrompts: UserPrompt[];

  // Navigation
  currentStep: number;
  completedSteps: number[];

  /** True after email/password sign-up when Supabase requires email confirmation (no session yet). */
  pendingEmailVerification: boolean;
  /** Email used for sign-up — for resend confirmation. */
  signupEmailForResend: string | null;

  /** True after profile + photos are saved at end of onboarding (persisted). */
  hasCompletedOnboardingProfile: boolean;
}

interface OnboardingActions {
  setUserId: (userId: string | null) => void;
  updateAvatar: (character: string, element: string, affiliation: string) => void;
  setLocationCoords: (latitude: number | null, longitude: number | null) => void;
  updateBasics: (data: {
    name: string;
    birthday: string;
    age: number;
    gender: 'woman' | 'man' | 'non-binary';
    interestedIn: 'men' | 'women' | 'everyone';
    location: string;
    latitude: number | null;
    longitude: number | null;
  }) => void;
  updateBio: (bio: string) => void;
  updatePhotos: (photos: string[]) => void;
  updateGameTypes: (gameTypes: string[]) => void;
  updateFavoriteGames: (favoriteGames: string[]) => void;
  setIntent: (intent: 'romance' | 'play' | 'both') => void;
  updateRelationship: (id: string) => void;
  updatePreferences: (data: { preferredAgeMin: number; preferredAgeMax: number; preferredDistance: number | null }) => void;
  updateLifestyle: (field: keyof Pick<OnboardingState, 'kids' | 'drinking' | 'smoking' | 'cannabis' | 'pets' | 'exercise'>, value: string) => void;
  updatePrompts: (prompts: UserPrompt[]) => void;
  completeStep: (step: number) => void;
  setCurrentStep: (step: number) => void;
  reset: () => void;
  markOnboardingCompleteAndClearDraft: () => void;
  setPendingEmailVerification: (payload: { userId: string; email: string }) => void;
  clearPendingEmailVerification: () => void;
}

const initialState: OnboardingState = {
  userId: null,
  character: null,
  element: null,
  affiliation: null,
  name: '',
  birthday: null,
  age: null,
  gender: null,
  interestedIn: null,
  location: '',
  latitude: null,
  longitude: null,
  bio: '',
  photos: loadSessionPhotos(),
  gameTypes: [],
  favoriteGames: [],
  intent: 'romance',
  lookingFor: [],
  preferredAgeMin: 18,
  preferredAgeMax: 65,
  preferredDistance: null,
  kids: null,
  drinking: null,
  smoking: null,
  cannabis: null,
  pets: null,
  exercise: null,
  userPrompts: [],
  currentStep: 0,
  completedSteps: [],
  pendingEmailVerification: false,
  signupEmailForResend: null,
  hasCompletedOnboardingProfile: false,
};

export const useOnboardingStore = create<OnboardingState & OnboardingActions>()(
  persist(
    (set) => ({
      ...initialState,

      setUserId: (userId) => set({ userId }),

      updateAvatar: (character, element, affiliation) =>
        set({ character, element, affiliation }),

      setLocationCoords: (latitude, longitude) => set({ latitude, longitude }),

      updateBasics: (data) =>
        set({
          name: data.name,
          birthday: data.birthday,
          age: data.age,
          gender: data.gender,
          interestedIn: data.interestedIn,
          location: data.location,
          latitude: data.latitude,
          longitude: data.longitude,
        }),

      updateBio: (bio) => set({ bio }),

      updatePhotos: (photos) => {
        try {
          if (photos.length > 0) sessionStorage.setItem('duel-photos', JSON.stringify(photos));
          else sessionStorage.removeItem('duel-photos');
        } catch {}
        set({ photos });
      },

      updateGameTypes: (gameTypes) => set({ gameTypes }),

      updateFavoriteGames: (favoriteGames) => set({ favoriteGames }),

      setIntent: (intent) => set({ intent }),

      updatePreferences: (data) =>
        set({
          preferredAgeMin: data.preferredAgeMin,
          preferredAgeMax: data.preferredAgeMax,
          preferredDistance: data.preferredDistance,
        }),

      updateRelationship: (id) =>
        set((state) => ({
          lookingFor: state.lookingFor.includes(id)
            ? state.lookingFor.filter((x) => x !== id)
            : [...state.lookingFor, id],
        })),

      updateLifestyle: (field, value) =>
        set((state) => ({ ...state, [field]: value })),

      updatePrompts: (prompts) => set({ userPrompts: prompts }),

      completeStep: (step) =>
        set((state) => ({
          completedSteps: state.completedSteps.includes(step)
            ? state.completedSteps
            : [...state.completedSteps, step],
        })),

      setCurrentStep: (step) => set({ currentStep: step }),

      setPendingEmailVerification: (payload) =>
        set({
          userId: payload.userId,
          pendingEmailVerification: true,
          signupEmailForResend: payload.email,
        }),

      clearPendingEmailVerification: () =>
        set({ pendingEmailVerification: false, signupEmailForResend: null }),

      reset: () => {
        try { sessionStorage.removeItem('duel-photos'); } catch {}
        set({ ...initialState, photos: [] });
      },

      markOnboardingCompleteAndClearDraft: () => {
        try { sessionStorage.removeItem('duel-photos'); } catch {}
        set({ ...initialState, photos: [], hasCompletedOnboardingProfile: true });
      },
    }),
    {
      name: 'duel-onboarding',
      version: 8,
      migrate: (persistedState: unknown) => {
        const s = persistedState as Record<string, unknown>;
        // v0 → v1: lookingFor changed from string|null to string[]
        if (typeof s.lookingFor === 'string') {
          s.lookingFor = s.lookingFor ? [s.lookingFor] : [];
        } else if (!Array.isArray(s.lookingFor)) {
          s.lookingFor = [];
        }
        // v2 → v3: add intent field (default to 'romance' for existing users)
        if (!s.intent) {
          s.intent = 'romance';
        }
        // v3 → v4: add preference fields + step index shift
        if (s.preferredAgeMin === undefined) s.preferredAgeMin = 18;
        if (s.preferredAgeMax === undefined) s.preferredAgeMax = 65;
        if (s.preferredDistance === undefined) s.preferredDistance = null;
        // v4 → v5: coordinates for location
        if (s.latitude === undefined) s.latitude = null;
        if (s.longitude === undefined) s.longitude = null;
        // Reset completedSteps because indices shifted
        s.completedSteps = [];
        // v5 → v6: email confirmation pending flags
        if (s.pendingEmailVerification === undefined) s.pendingEmailVerification = false;
        if (s.signupEmailForResend === undefined) s.signupEmailForResend = null;
        // v6 → v7: onboarding completion flag (resume after sign-up moved earlier)
        if (s.hasCompletedOnboardingProfile === undefined) s.hasCompletedOnboardingProfile = false;
        // v7 → v8: step indices shifted again — reset completedSteps
        s.completedSteps = [];
        return s;
      },
      partialize: (state) => {
        const { photos: _photos, ...rest } = state;
        return rest;
      },
    }
  )
);

// Step definitions for routing
export const STEPS = [
  { id: 0, path: '/onboarding/welcome', label: 'Welcome' },
  { id: 1, path: '/onboarding/create-account', label: 'Create Account' },
  { id: 2, path: '/onboarding/avatar', label: 'Avatar' },
  { id: 3, path: '/onboarding/basics', label: 'Basics' },
  { id: 4, path: '/onboarding/photos', label: 'Photos' },
  { id: 5, path: '/onboarding/relationship-goals', label: 'Goals' },
  { id: 6, path: '/onboarding/preferences', label: 'Preferences' },
  { id: 7, path: '/onboarding/preview', label: 'Preview' },
] as const;

/** Indices for the top progress bar — one dot per step after Welcome (STEPS ids 1 … last). */
export const ONBOARDING_PROGRESS_DOTS = Array.from(
  { length: STEPS.length - 1 },
  (_, i) => i
);
