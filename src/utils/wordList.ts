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
 * Check if a string is a valid word
 */
export function isValidWord(word: string): boolean {
  if (!loadedWords) return false;
  return loadedWords.has(word.toLowerCase());
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
