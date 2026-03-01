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

export interface OnboardingState {
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

  // Photos
  photos: string[]; // base64 data URLs for persistence

  // Games
  gameTypes: string[];
  favoriteGames: string[];

  // Relationship
  lookingFor: string[];

  // Lifestyle
  kids: string | null;
  drinking: string | null;
  smoking: string | null;
  cannabis: string | null;
  pets: string | null;
  exercise: string | null;

  // Navigation
  currentStep: number;
  completedSteps: number[];
}

interface OnboardingActions {
  updateAvatar: (character: string, element: string, affiliation: string) => void;
  updateBasics: (data: {
    name: string;
    birthday: string;
    age: number;
    gender: 'woman' | 'man' | 'non-binary';
    interestedIn: 'men' | 'women' | 'everyone';
    location: string;
  }) => void;
  updatePhotos: (photos: string[]) => void;
  updateGameTypes: (gameTypes: string[]) => void;
  updateFavoriteGames: (favoriteGames: string[]) => void;
  updateRelationship: (id: string) => void;
  updateLifestyle: (field: keyof Pick<OnboardingState, 'kids' | 'drinking' | 'smoking' | 'cannabis' | 'pets' | 'exercise'>, value: string) => void;
  completeStep: (step: number) => void;
  setCurrentStep: (step: number) => void;
  reset: () => void;
}

const initialState: OnboardingState = {
  character: null,
  element: null,
  affiliation: null,
  name: '',
  birthday: null,
  age: null,
  gender: null,
  interestedIn: null,
  location: '',
  photos: loadSessionPhotos(),
  gameTypes: [],
  favoriteGames: [],
  lookingFor: [],
  kids: null,
  drinking: null,
  smoking: null,
  cannabis: null,
  pets: null,
  exercise: null,
  currentStep: 0,
  completedSteps: [],
};

export const useOnboardingStore = create<OnboardingState & OnboardingActions>()(
  persist(
    (set) => ({
      ...initialState,

      updateAvatar: (character, element, affiliation) =>
        set({ character, element, affiliation }),

      updateBasics: (data) =>
        set({
          name: data.name,
          birthday: data.birthday,
          age: data.age,
          gender: data.gender,
          interestedIn: data.interestedIn,
          location: data.location,
        }),

      updatePhotos: (photos) => {
        try {
          if (photos.length > 0) sessionStorage.setItem('duel-photos', JSON.stringify(photos));
          else sessionStorage.removeItem('duel-photos');
        } catch {}
        set({ photos });
      },

      updateGameTypes: (gameTypes) => set({ gameTypes }),

      updateFavoriteGames: (favoriteGames) => set({ favoriteGames }),

      updateRelationship: (id) =>
        set((state) => ({
          lookingFor: state.lookingFor.includes(id)
            ? state.lookingFor.filter((x) => x !== id)
            : [...state.lookingFor, id],
        })),

      updateLifestyle: (field, value) =>
        set((state) => ({ ...state, [field]: value })),

      completeStep: (step) =>
        set((state) => ({
          completedSteps: state.completedSteps.includes(step)
            ? state.completedSteps
            : [...state.completedSteps, step],
        })),

      setCurrentStep: (step) => set({ currentStep: step }),

      reset: () => {
        try { sessionStorage.removeItem('duel-photos'); } catch {}
        set({ ...initialState, photos: [] });
      },
    }),
    {
      name: 'duel-onboarding',
      partialize: (state) => {
        // Exclude photos — base64 data URLs are too large for localStorage (5 MB limit).
        // Photos live in memory only for the duration of the onboarding session.
        const { photos: _photos, ...rest } = state;
        return rest;
      },
    }
  )
);

// Step definitions for routing
export const STEPS = [
  { id: 0, path: '/onboarding/welcome', label: 'Welcome' },
  { id: 1, path: '/onboarding/avatar', label: 'Avatar' },
  { id: 2, path: '/onboarding/basics', label: 'Basics' },
  { id: 3, path: '/onboarding/photos', label: 'Photos' },
  { id: 4, path: '/onboarding/games', label: 'Games' },
  { id: 5, path: '/onboarding/relationship-goals', label: 'Goals' },
  { id: 6, path: '/onboarding/lifestyle', label: 'Lifestyle' },
  { id: 7, path: '/onboarding/preview', label: 'Preview' },
] as const;
