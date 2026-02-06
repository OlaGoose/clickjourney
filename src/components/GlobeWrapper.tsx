'use client';

import type { MutableRefObject, RefObject } from 'react';
import Globe from 'react-globe.gl';
import type { GlobeMethods, GlobeProps } from 'react-globe.gl';

export interface GlobeWrapperProps extends Omit<GlobeProps, 'ref'> {
  globeRef: RefObject<GlobeMethods | null>;
}

/**
 * Wraps react-globe.gl so ref can be passed via a prop.
 * Use this with next/dynamic: the LoadableComponent does not forward refs,
 * so we pass the ref as globeRef instead.
 * Cast needed: react-globe.gl ref type does not allow null on .current.
 */
export default function GlobeWrapper({ globeRef, ...props }: GlobeWrapperProps) {
  return (
    <Globe
      ref={globeRef as MutableRefObject<GlobeMethods | undefined>}
      {...props}
    />
  );
}
