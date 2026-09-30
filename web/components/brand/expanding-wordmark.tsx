import { useId } from 'react';
import { iconAsset, iconBracePath } from '@/content/icon-motion';
import styles from './icon-animation.module.css';

// One continuous silhouette, based on the supplied curly braces. Mirroring the
// same path keeps both sides symmetrical throughout each extension.
export function ExpandingWordmark() {
  const id = useId();
  return (
    <svg
      className={styles.wordmarkSvg}
      viewBox="0 0 1000 1000"
      fill="#caff68"
      aria-hidden="true"
    >
      <defs>
        <clipPath id={`${id}-initials`}>
          <rect x="350" y="350" width="285" height="275" />
        </clipPath>
        <clipPath id={`${id}-name`}>
          <rect x="203" y="405" width="594" height="150" />
        </clipPath>
      </defs>
      <g className={styles.bracePair} data-part="braces">
        <path
          d={iconBracePath}
          className={styles.braceShape}
          data-brace="left"
        />
        <g transform="translate(1000 0) scale(-1 1)">
          <path
            d={iconBracePath}
            className={styles.braceShape}
            data-brace="right"
          />
        </g>
      </g>
      <image
        href={iconAsset(2)}
        width="1000"
        height="1000"
        clipPath={`url(#${id}-initials)`}
        className={`${styles.lettering} ${styles.initials}`}
        data-frame="2"
      />
      <image
        href={iconAsset(3)}
        width="1000"
        height="1000"
        clipPath={`url(#${id}-name)`}
        className={`${styles.lettering} ${styles.name}`}
        data-frame="3"
      />
    </svg>
  );
}
