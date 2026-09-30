'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { iconAsset, iconFrames } from '@/content/icon-motion';
import styles from './icon-animation.module.css';
import { ExpandingWordmark } from './expanding-wordmark';
import { LoadingRobot } from './loading-robot';

type IconAnimationProps = {
  variant?: 'sequence' | 'loading';
  paused?: boolean;
  className?: string;
  label?: string;
};

/** Brand loop: extend, blink twice, reverse. Loading repeats independently. */
export function IconAnimation({
  variant = 'sequence',
  paused = false,
  className = '',
  label = variant === 'loading'
    ? 'Loading'
    : 'Codelah: braces, initials, wordmark, and blinking robot',
}: IconAnimationProps) {
  const frames = iconFrames.slice(3);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (variant === 'loading') return;
    let cancelled = false;
    // SVG image load events can precede hydration. decode() also handles cached
    // assets so the sequence starts reliably on initial load and replay.
    Promise.all(
      [2, 3, 4, 5].map((id) => {
        const image = new window.Image();
        image.src = iconAsset(id);
        return image.decode();
      }),
    )
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch(() => {
        // Keep the compact braces visible if any required asset cannot load.
      });
    return () => {
      cancelled = true;
    };
  }, [variant]);

  return (
    <div
      className={`${styles.animation} ${styles[variant]} ${className}`}
      data-ready={variant === 'loading' || ready}
      data-paused={paused}
      data-variant={variant}
      role={variant === 'loading' ? 'status' : 'img'}
      aria-label={variant === 'sequence' ? label : undefined}
    >
      {variant === 'loading' && <span className={styles.srOnly}>{label}</span>}
      <div className={styles.art} aria-hidden="true">
        {variant === 'loading' && (
          <div className={styles.halos}>
            <span className={styles.halo} />
            <span className={styles.halo} />
            <span className={styles.halo} />
          </div>
        )}
        <div className={styles.tile}>
          {variant === 'loading' && <LoadingRobot />}
          {variant === 'sequence' && <ExpandingWordmark />}
          {variant === 'sequence' && (
            <div className={styles.sequenceRobot} data-part="robot">
              {frames.map((frame) => (
                <Image
                  key={frame.id}
                  src={iconAsset(frame.id)}
                  alt=""
                  width={1024}
                  height={1024}
                  unoptimized
                  loading="eager"
                  className={`${styles.frame} ${styles[`frame${frame.id}`]}`}
                  data-frame={frame.id}
                  draggable={false}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
