export const iconFrames = [
  { id: 1, label: "Braces" },
  { id: 2, label: "Initials" },
  { id: 3, label: "Codelah" },
  { id: 4, label: "Awake" },
  { id: 5, label: "Blink" },
] as const;

export const typewriterCopy = {
  greeting: "hello, world",
  completion: "<ready />",
  footer: "code. grow. repeat.",
} as const;

export const iconAsset = (id: number) => id <= 3 ? `/brand/cl-logo-${id}-aligned.svg` : `/brand/cl-logo-${id}-polished.png`;

export const iconDownloadAsset = (id: number) =>
  id <= 3 ? `/brand/cl-logo-${id}-aligned.svg` : iconAsset(id);

export const iconBracePath =
  "M192 0H143C92 0 55 37 55 91V143C55 178 40 197 0 203V252C40 258 55 278 55 313V365C55 420 92 456 143 456H192V408H144C115 408 104 389 104 365V313C104 274 92 247 64 228C92 209 104 181 104 143V91C104 67 115 48 144 48H192Z";
