import { brand } from '@/config/brand';
import styles from './typewriter-animation.module.css';

/** Shared finished mark; only the header opts into the one-time typing entrance. */
export function TypewriterLogo({ animated = false }: { animated?: boolean }) {
  return (
    <span
      className={styles.logo}
      data-logo-motion={animated ? 'once' : 'static'}
      aria-hidden="true"
    >
      <TypewriterLine mode={animated ? 'once' : 'static'} />
    </span>
  );
}

export function TypewriterLine({
  mode = 'loop',
}: {
  mode?: 'loop' | 'once' | 'static';
}) {
  return (
    <span className={styles.line} data-mode={mode} aria-hidden="true">
      <span className={styles.brace}>{'{'}</span>
      <span className={styles.typed} data-part="typed">
        {brand.wordmark}
      </span>
      <span className={styles.caret}>
        <svg
          className={styles.sprout}
          data-part="sprout"
          viewBox="0 0 40 44"
          fill="none"
        >
          <path
            d="M20 43V20"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M20 27C4 27 3 17 3 11C14 11 20 17 20 27ZM20 20C20 5 28 2 37 2C37 12 31 20 20 20Z"
            fill="currentColor"
          />
        </svg>
      </span>
      <span className={styles.brace}>{'}'}</span>
    </span>
  );
}
