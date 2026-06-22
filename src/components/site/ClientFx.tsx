'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { cancelWhenIdle, runWhenIdle } from '@/lib/idle';

const AmbientLights = dynamic(
  () => import('@/components/site/AmbientLights').then((mod) => ({ default: mod.AmbientLights })),
  { ssr: false },
);

const CustomCursor = dynamic(
  () => import('@/components/site/CustomCursor').then((mod) => ({ default: mod.CustomCursor })),
  { ssr: false },
);

const CursorParticles = dynamic(
  () => import('@/components/site/CursorParticles').then((mod) => ({ default: mod.CursorParticles })),
  { ssr: false },
);

export function ClientFx() {
  const [ambientReady, setAmbientReady] = useState(false);
  const [pointerReady, setPointerReady] = useState(false);

  useEffect(() => {
    const ambientId = runWhenIdle(() => setAmbientReady(true), 1200);
    const pointerId = runWhenIdle(() => {
      if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        setPointerReady(true);
      }
    }, 1800);

    return () => {
      cancelWhenIdle(ambientId);
      cancelWhenIdle(pointerId);
    };
  }, []);

  return (
    <>
      {ambientReady ? <AmbientLights /> : null}
      {pointerReady ? (
        <>
          <CustomCursor />
          <CursorParticles />
        </>
      ) : null}
    </>
  );
}
