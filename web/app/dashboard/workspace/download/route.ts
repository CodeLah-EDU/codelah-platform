import { supabaseServer } from '@/lib/supabase/server';
import { isId } from '@/lib/lessons';

// Proxy the private download so every open rechecks RLS, including revocations.
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const id = query.get('id') || '';
  const worksheet = query.get('kind') === 'worksheet';
  if (!isId(id)) return new Response('Not found', { status: 404 });
  const client = await supabaseServer();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return new Response('Sign in to download', { status: 401 });
  const { data: record } = await client
    .from(worksheet ? 'worksheet_assets' : 'lesson_files')
    .select('storage_path,file_name,mime_type')
    .eq(worksheet ? 'worksheet_id' : 'id', id)
    .single();
  if (!record)
    return new Response('This file is locked or unavailable.', { status: 403 });
  const { data: file, error } = await client.storage
    .from(worksheet ? 'worksheet-library' : 'lesson-files')
    .download(record.storage_path);
  if (error || !file) return new Response('File unavailable', { status: 404 });
  const inline =
    query.get('open') === '1' && record.mime_type === 'application/pdf';
  return new Response(file, {
    headers: {
      'Content-Type': inline ? 'application/pdf' : 'application/octet-stream',
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(record.file_name).replace(/'/g, '%27')}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "sandbox; default-src 'none'",
    },
  });
}
