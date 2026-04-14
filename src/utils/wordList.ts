const WORD_LIST_URL = '/wordblitz/words-scowl-50k.txt';

let loadedWords: Set<string> | null = null;
let loadingPromise: Promise<Set<string>> | null = null;

function parseWordList(raw: string): Set<string> {
  const words = raw
    .split(/\r?\n/)
    .map((line) => line.trim().toLowerCase())
    .filter((line) => line.length > 0);
  return new Set(words);
}

export async function preloadWordList(): Promise<Set<string>> {
  if (loadedWords) return loadedWords;
  if (loadingPromise) return loadingPromise;

  loadingPromise = fetch(WORD_LIST_URL)
    .then(async (res) => {
      if (!res.ok) throw new Error(`Failed to load word list: ${res.status}`);
      const text = await res.text();
      loadedWords = parseWordList(text);
      return loadedWords;
    })
    .finally(() => {
      loadingPromise = null;
    });

  return loadingPromise;
}

export function isWordListLoaded(): boolean {
  return loadedWords !== null;
}

/**
 * Given an inflected word, return candidate base forms by reversing
 * common English suffixes.  Only returns stems that are ≥ 2 characters.
 */
function inflectionStems(w: string): string[] {
  const stems: string[] = [];

  // -ies → -y  (babies→baby, cries→cry)
  if (w.endsWith('ies') && w.length >= 4)
    stems.push(w.slice(0, -3) + 'y');

  // -es after sibilants: -shes→-sh, -ches→-ch, -xes→-x, -zes→-z, -ses→-s
  if (w.endsWith('es') && w.length >= 4) {
    const pre = w.slice(0, -2);
    if (/(?:sh|ch|x|z|s)$/.test(pre)) stems.push(pre);
  }

  // plain -s (cats→cat)
  if (w.endsWith('s') && !w.endsWith('ss') && w.length >= 4)
    stems.push(w.slice(0, -1));

  // -ied → -y  (tried→try)
  if (w.endsWith('ied') && w.length >= 4)
    stems.push(w.slice(0, -3) + 'y');

  // doubled-consonant + ed/ing  (pinned→pin, running→run)
  for (const suf of ['ed', 'ing']) {
    if (w.endsWith(suf) && w.length >= suf.length + 3) {
      const base = w.slice(0, -suf.length);
      if (base.length >= 3 && base[base.length - 1] === base[base.length - 2])
        stems.push(base.slice(0, -1));
    }
  }

  // -ed  (played→play, baked→bake)
  if (w.endsWith('ed') && w.length >= 4) {
    stems.push(w.slice(0, -2));       // played → play
    stems.push(w.slice(0, -1));       // baked  → bake (drop just "d")
  }

  // -ing  (caring→care, playing→play)
  if (w.endsWith('ing') && w.length >= 5) {
    stems.push(w.slice(0, -3));           // playing → play
    stems.push(w.slice(0, -3) + 'e');     // caring  → care
  }

  return stems.filter(s => s.length >= 2);
}

/**
 * Check if a string is a valid word
 */
export function isValidWord(word: string): boolean {
  if (!loadedWords) return false;
  const w = word.toLowerCase();
  if (loadedWords.has(w)) return true;

  // Fallback: accept the word if a recognised base form exists
  return inflectionStems(w).some(stem => loadedWords!.has(stem));
}

/**
 * Score a word by its length
 */
export function scoreWord(word: string): number {
  const len = word.length;
  if (len >= 6) return 40;
  if (len === 5) return 25;
  if (len === 4) return 15;
  if (len === 3) return 10;
  return 0;
}
