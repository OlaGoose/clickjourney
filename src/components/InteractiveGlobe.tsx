/*
 * @Author: meta-kk 11097094+teacher-kk@user.noreply.gitee.com
 * @Date: 2026-02-05 00:27:15
 * @LastEditors: meta-kk 11097094+teacher-kk@user.noreply.gitee.com
 * @LastEditTime: 2026-02-05 18:32:07
 * @FilePath: /orbit-journey-next/src/components/InteractiveGlobe.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import type { LocationData } from '@/types';

const Globe = dynamic(() => import('@/components/GlobeWrapper'), { ssr: false });

/** 初始相机高度（地球半径倍数），越大地球越远 */
const INITIAL_ALTITUDE = 4;
const POV_TRANSITION_MS = 1000;

interface InteractiveGlobeProps {
  center: LocationData;
  onGlobeReady?: () => void;
}

export default function InteractiveGlobe({ center, onGlobeReady }: InteractiveGlobeProps) {
  const [globeWidth, setGlobeWidth] = useState(800);
  const [globeHeight, setGlobeHeight] = useState(600);
  const globeEl = useRef<any>(undefined);

  useEffect(() => {
    const handleResize = () => {
      setGlobeWidth(window.innerWidth);
      setGlobeHeight(window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const setPointOfView = useCallback(() => {
    if (!globeEl.current || !center) return;
    globeEl.current.pointOfView(
      { lat: center.lat, lng: center.lng, altitude: INITIAL_ALTITUDE },
      POV_TRANSITION_MS
    );
  }, [center]);

  useEffect(() => {
    setPointOfView();
  }, [setPointOfView]);

  const handleGlobeReady = useCallback(() => {
    setPointOfView();
    onGlobeReady?.();
  }, [setPointOfView, onGlobeReady]);

  const ringData = useMemo(() => [center], [center]);

  return (
    <div className="absolute inset-0 z-10 cursor-grab active:cursor-grabbing">
      <Globe
        globeRef={globeEl}
        onGlobeReady={handleGlobeReady}
        width={globeWidth}
        height={globeHeight}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundColor="rgba(0,0,0,0)"
        atmosphereColor="#fbbf24"
        atmosphereAltitude={0.15}
        ringsData={ringData}
        ringColor={() => '#fbbf24'}
        ringMaxRadius={2.5}
        ringPropagationSpeed={2}
        ringRepeatPeriod={800}
        labelsData={[center]}
        labelLat={(d: unknown) => (d as LocationData).lat}
        labelLng={(d: unknown) => (d as LocationData).lng}
        labelText={(d: unknown) => (d as LocationData).name}
        labelSize={1.5}
        labelDotRadius={0.8}
        labelColor={() => '#fbbf24'}
        labelResolution={2}
      />
      <div className="pointer-events-none absolute bottom-0 left-0 h-1/2 w-full bg-gradient-to-t from-black via-black/80 to-transparent" />
    </div>
  );
}
