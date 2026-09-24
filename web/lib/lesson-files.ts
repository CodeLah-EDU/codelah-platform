export const LESSON_FILE_BUCKET = 'lesson-files';
export const MAX_LESSON_FILE_BYTES = 10 * 1024 * 1024;
export const LESSON_FILE_ACCEPT = [
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.txt',
  '.csv',
  '.json',
  '.zip',
  '.sb3',
  '.py',
  '.js',
  '.ts',
  '.tsx',
  '.jsx',
  '.java',
  '.c',
  '.cpp',
  '.cs',
  '.html',
  '.css',
  '.docx',
  '.pptx',
  '.xlsx',
].join(',');

const types: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  txt: 'text/plain',
  csv: 'text/csv',
  json: 'application/json',
  zip: 'application/zip',
  sb3: 'application/octet-stream',
  py: 'text/plain',
  js: 'text/plain',
  ts: 'text/plain',
  tsx: 'text/plain',
  jsx: 'text/plain',
  java: 'text/plain',
  c: 'text/plain',
  cpp: 'text/plain',
  cs: 'text/plain',
  html: 'text/plain',
  css: 'text/plain',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

export type LessonFileInput = { name: string; size: number; type?: string };

export function validateLessonFile(file: LessonFileInput) {
  const name = cleanFileName(file.name);
  const extension = name.includes('.')
    ? name.split('.').pop()!.toLowerCase()
    : '';
  if (!types[extension]) throw new Error('Unsupported file type');
  if (
    !Number.isSafeInteger(file.size) ||
    file.size < 1 ||
    file.size > MAX_LESSON_FILE_BYTES
  )
    throw new Error('File must be between 1 byte and 10 MB');
  return { name, extension, mimeType: types[extension] };
}

export function cleanFileName(value: string) {
  const name = value
    .normalize('NFKC')
    .replace(/[\\/]/g, '_')
    .split('')
    .map((character) => {
      const code = character.charCodeAt(0);
      return code < 32 || code === 127 ? '_' : character;
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
  if (!name || name === '.' || name === '..')
    throw new Error('Invalid file name');
  return name.length <= 180 ? name : name.slice(name.length - 180);
}

export function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
