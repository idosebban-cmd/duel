/**
 * Deterministic character board generation for Guess Who.
 *
 * Both clients generate the identical board + secret picks by seeding
 * the PRNG with the matchId. No server required.
 */
import type { Character, CharacterAttributes } from '../types/game';

// ── Seeded PRNG (mulberry32) ────────────────────────────────────────────────

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Static character data ───────────────────────────────────────────────────

interface CharDef {
  type: CharacterAttributes['type'];
  color: CharacterAttributes['color'];
  displayColor: string; // hex for CharacterCard border/glow
  wings: boolean;
  glasses: boolean;
  hat: boolean;
  magic: boolean;
}

const ALL_CHARS: CharDef[] = [
  { type: 'unicorn',  color: 'rainbow', displayColor: '#E879F9', wings: false, glasses: false, hat: false,  magic: true },
  { type: 'cat',      color: 'orange',  displayColor: '#FB923C', wings: false, glasses: true,  hat: false,  magic: false },
  { type: 'phoenix',  color: 'fire',    displayColor: '#F97316', wings: true,  glasses: false, hat: false,  magic: true },
  { type: 'robot',    color: 'silver',  displayColor: '#94A3B8', wings: false, glasses: true,  hat: false,  magic: false },
  { type: 'lion',     color: 'golden',  displayColor: '#FBBF24', wings: false, glasses: false, hat: true,   magic: false },
  { type: 'bear',     color: 'brown',   displayColor: '#A16207', wings: false, glasses: false, hat: true,   magic: false },
  { type: 'ghost',    color: 'white',   displayColor: '#E2E8F0', wings: false, glasses: false, hat: false,  magic: true },
  { type: 'fox',      color: 'orange',  displayColor: '#EA580C', wings: false, glasses: true,  hat: false,  magic: false },
  { type: 'owl',      color: 'brown',   displayColor: '#92400E', wings: true,  glasses: true,  hat: false,  magic: false },
  { type: 'octopus',  color: 'purple',  displayColor: '#A855F7', wings: false, glasses: false, hat: true,   magic: true },
  { type: 'wolf',     color: 'gray',    displayColor: '#6B7280', wings: false, glasses: false, hat: false,  magic: false },
  { type: 'dragon',   color: 'fire',    displayColor: '#DC2626', wings: true,  glasses: false, hat: false,  magic: true },
  { type: 'witch',    color: 'green',   displayColor: '#22C55E', wings: false, glasses: false, hat: true,   magic: true },
  { type: 'knight',   color: 'silver',  displayColor: '#64748B', wings: false, glasses: false, hat: true,   magic: false },
  { type: 'viking',   color: 'red',     displayColor: '#EF4444', wings: false, glasses: false, hat: true,   magic: false },
  { type: 'pixie',    color: 'pink',    displayColor: '#EC4899', wings: true,  glasses: false, hat: false,  magic: true },
  { type: 'ninja',    color: 'black',   displayColor: '#334155', wings: false, glasses: false, hat: true,   magic: false },
  { type: 'mermaid',  color: 'teal',    displayColor: '#14B8A6', wings: false, glasses: false, hat: false,  magic: true },
];

function charDefToCharacter(def: CharDef): Character {
  const name = def.type.charAt(0).toUpperCase() + def.type.slice(1);
  return {
    id: def.type,
    name,
    color: def.displayColor,
    image: `/characters/${name}.png`,
    attributes: {
      type: def.type,
      color: def.color,
      wings: def.wings,
      glasses: def.glasses,
      hat: def.hat,
      magic: def.magic,
    },
  };
}

// ── Public API ──────────────────────────────────────────────────────────────

export interface GuessWhoBoard {
  characters: Character[];
  p1SecretId: string;
  p2SecretId: string;
}

/**
 * Generate a deterministic Guess Who board from a matchId.
 * Both clients calling this with the same matchId get the same result.
 */
export function generateGuessWhoBoard(matchId: string): GuessWhoBoard {
  const seed = hashString(matchId);
  const rng = mulberry32(seed);

  // Shuffle character order (cosmetic — same set of 18)
  const shuffled = seededShuffle(ALL_CHARS, rng);
  const characters = shuffled.map(charDefToCharacter);

  // Pick two different secrets
  const p1Idx = Math.floor(rng() * characters.length);
  let p2Idx = Math.floor(rng() * (characters.length - 1));
  if (p2Idx >= p1Idx) p2Idx++;

  return {
    characters,
    p1SecretId: characters[p1Idx].id,
    p2SecretId: characters[p2Idx].id,
  };
}
