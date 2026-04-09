/** Inline prompt icons under public/game-icons — URL-encoded paths match gameTypeIcons pattern. */
export type PromptCategory = 'games' | 'fun' | 'personality' | 'playful';

export const PROMPT_CATEGORY_ICON_SRC: Record<PromptCategory, string> = {
  games: '/game-icons/Video%20games.png',
  fun: '/game-icons/Party%20games.png',
  personality: '/game-icons/Coop%20games.png',
  playful: '/game-icons/Coop%20games.png',
};

export function promptCategoryIconSrc(category: string): string {
  const c = category as PromptCategory;
  if (c === 'games' || c === 'fun' || c === 'personality' || c === 'playful') {
    return PROMPT_CATEGORY_ICON_SRC[c];
  }
  return PROMPT_CATEGORY_ICON_SRC.games;
}
