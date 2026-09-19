import { redirect } from 'next/navigation';
import { supabaseServer, configured } from './server';
import type { Account } from '@/lib/accounts';
export async function currentAccount() {
  if (!configured()) redirect('/login');
  const client = await supabaseServer();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) redirect('/login');
  const { data: account, error: profileError } = await client
    .from('accounts')
    .select('id,display_name,role,status')
    .eq('id', user.id)
    .single();
  return {
    client,
    user,
    account: account as Account | null,
    error: profileError,
  };
}
