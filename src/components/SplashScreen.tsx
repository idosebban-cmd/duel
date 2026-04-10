import { useEffect, useState } from 'react';

const DISPLAY_MS = 3000;
const FADE_MS = 400;

type Phase = 'visible' | 'fadeOut';

interface SplashScreenProps {
  onDismiss: () => void;
}

export function SplashScreen({ onDismiss }: SplashScreenProps) {
  const [phase, setPhase] = useState<Phase>('visible');

  useEffect(() => {
    const id = window.setTimeout(() => {
      setPhase((prev) => (prev === 'visible' ? 'fadeOut' : prev));
    }, DISPLAY_MS);
    return () => window.clearTimeout(id);
  }, []);

  const handleTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.propertyName !== 'opacity') return;
    if (phase !== 'fadeOut') return;
    onDismiss();
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#12122A]"
      style={{
        opacity: phase === 'visible' ? 1 : 0,
        transition: `opacity ${FADE_MS}ms ease-out`,
        pointerEvents: phase === 'visible' ? 'auto' : 'none',
      }}
      onTransitionEnd={handleTransitionEnd}
      aria-hidden
    >
      <img
        src="/Splash.png"
        alt=""
        className="h-full w-full object-contain"
        draggable={false}
      />
    </div>
  );
}
