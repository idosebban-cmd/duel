import { useEffect, useState } from 'react';

const DISPLAY_MS = 2000;
const FADE_MS = 400;

type Phase = 'visible' | 'fadeOut';

interface SplashScreenProps {
  onDismiss: () => void;
}

export function SplashScreen({ onDismiss }: SplashScreenProps) {
  const [phase, setPhase] = useState<Phase>('visible');
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    if (!imageLoaded) return;
    const id = window.setTimeout(() => setPhase('fadeOut'), DISPLAY_MS);
    return () => window.clearTimeout(id);
  }, [imageLoaded]);

  const handleTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.propertyName !== 'opacity') return;
    if (phase !== 'fadeOut') return;
    onDismiss();
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#000000]"
      style={{
        opacity: phase === 'visible' ? 1 : 0,
        transition: `opacity ${FADE_MS}ms ease-out`,
        pointerEvents: phase === 'visible' ? 'auto' : 'none',
      }}
      onTransitionEnd={handleTransitionEnd}
      aria-hidden
    >
      <img
        src="/splash.png"
        alt=""
        className="h-full w-full object-contain"
        draggable={false}
        onLoad={() => setImageLoaded(true)}
      />
    </div>
  );
}
