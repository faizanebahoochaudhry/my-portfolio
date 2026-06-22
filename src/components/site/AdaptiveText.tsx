'use client';

import { useEffect, useState } from 'react';
import { ScrambleText } from '@/components/site/ScrambleText';

type AdaptiveTextProps = {
  children: string;
  scrambleTo?: string;
  className?: string;
};

export function AdaptiveText({ children, scrambleTo, className }: AdaptiveTextProps) {
  const [finePointer, setFinePointer] = useState(false);

  useEffect(() => {
    setFinePointer(window.matchMedia('(hover: hover) and (pointer: fine)').matches);
  }, []);

  if (!finePointer) {
    return <span className={className}>{children}</span>;
  }

  return (
    <ScrambleText scrambleTo={scrambleTo} className={className}>
      {children}
    </ScrambleText>
  );
}
