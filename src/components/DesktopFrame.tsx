import { Capacitor } from '@capacitor/core';
import type { ReactNode } from 'react';

interface DesktopFrameProps {
  children: ReactNode;
}

export function DesktopFrame({ children }: DesktopFrameProps) {
  if (Capacitor.isNativePlatform()) {
    return <>{children}</>;
  }

  return (
    <div className="lg:min-h-screen lg:bg-[#12122A] lg:halftone lg:flex lg:items-center lg:justify-center">
      <div className="lg:w-full lg:max-w-[430px] lg:h-screen lg:overflow-auto lg:bg-cream lg:shadow-neon-cyan lg:border lg:border-electric-mint/40 lg:relative lg:[transform:translateZ(0)]">
        {children}
      </div>
    </div>
  );
}
