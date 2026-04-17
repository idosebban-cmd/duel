import { useCallback, useEffect, useRef } from 'react';

type Scroller = HTMLElement | (Window & typeof globalThis);

function findScroller(from: HTMLElement | null): Scroller {
  let el: HTMLElement | null = from;
  while (el && el !== document.body) {
    const oy = getComputedStyle(el).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight) {
      return el;
    }
    el = el.parentElement;
  }
  return window;
}

function scrollToTop(scroller: Scroller) {
  if (scroller === window) window.scrollTo({ top: 0, behavior: 'auto' });
  else (scroller as HTMLElement).scrollTo({ top: 0, behavior: 'auto' });
}

function scrollToBottom(scroller: Scroller) {
  if (scroller === window) {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
  } else {
    const el = scroller as HTMLElement;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }
}

export function useOnboardingScroll<T extends HTMLElement = HTMLDivElement>(canContinue: boolean) {
  const scrollRef = useRef<T>(null);
  const wasReadyRef = useRef(false);

  const resetToTop = useCallback(() => {
    requestAnimationFrame(() => {
      if (!scrollRef.current) return;
      scrollToTop(findScroller(scrollRef.current));
    });
  }, []);

  useEffect(() => {
    resetToTop();
  }, [resetToTop]);

  useEffect(() => {
    if (canContinue && !wasReadyRef.current) {
      wasReadyRef.current = true;
      requestAnimationFrame(() => {
        if (!scrollRef.current) return;
        scrollToBottom(findScroller(scrollRef.current));
      });
    } else if (!canContinue && wasReadyRef.current) {
      wasReadyRef.current = false;
    }
  }, [canContinue]);

  return { scrollRef, resetToTop };
}
