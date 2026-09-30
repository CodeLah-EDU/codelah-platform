import styles from './icon-animation.module.css';

/** Fixed robot geometry keeps the transparent blink perfectly registered. */
export function LoadingRobot() {
  return (
    <svg
      viewBox="0 0 1000 1000"
      className={styles.robotSvg}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M483 328h34v67h-34z" />
      <circle cx="500" cy="293" r="42" />
      <rect
        x="306"
        y="393"
        width="388"
        height="282"
        rx="73"
        fill="none"
        stroke="currentColor"
        strokeWidth="44"
      />
      <path d="M270 476h-14c-20 0-34 15-34 35v55c0 20 14 34 34 34h14zM730 476h14c20 0 34 15 34 35v55c0 20-14 34-34 34h-14z" />
      <path
        d="M473 575Q500 597 527 575"
        fill="none"
        stroke="currentColor"
        strokeWidth="28"
        strokeLinecap="round"
      />
      <g className={styles.openEyes} data-frame="4">
        <circle cx="403" cy="533" r="35" />
        <circle cx="597" cy="533" r="35" />
      </g>
      <g
        className={styles.closedEyes}
        data-frame="5"
        fill="none"
        stroke="currentColor"
        strokeWidth="26"
        strokeLinecap="round"
      >
        <path d="M376 536Q403 552 430 536M570 536Q597 552 624 536" />
      </g>
    </svg>
  );
}
