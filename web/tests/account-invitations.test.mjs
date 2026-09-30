import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

// Exercise the real Edge Function handler with in-memory Auth/DB adapters.
// No Supabase credentials, network calls, or email delivery are used.
const source = await readFile(
  new URL(
    '../../supabase/functions/student-accounts/index.ts',
    import.meta.url,
  ),
  'utf8',
);
const code = ts.transpileModule(source.replace(/^import .*;\r?\n/, ''), {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.None,
  },
}).outputText;
function fixture({
  role = 'admin',
  status = 'active',
  signedIn = true,
  origin = 'https://school.example',
  profileError = false,
  inviteError = false,
} = {}) {
  let handler;
  const invites = [],
    updates = [];
  const actorClient = {
    auth: {
      getUser: async () => ({
        data: { user: signedIn ? { id: 'actor' } : null },
        error: null,
      }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: { role, status }, error: null }),
        }),
      }),
    }),
  };
  const adminClient = {
    auth: {
      admin: {
        inviteUserByEmail: async (email, options) => {
          invites.push({ email, ...options });
          return {
            data: { user: inviteError ? null : { id: 'invited' } },
            error: inviteError ? { message: 'provider detail' } : null,
          };
        },
      },
    },
    from: (table) => ({
      update: (values) => {
        const filters = [];
        updates.push({ table, values, filters });
        const chain = {
          eq: (key, value) => {
            filters.push([key, value]);
            return chain;
          },
          select: () => chain,
          maybeSingle: async () => ({
            data: profileError ? null : { id: 'invited' },
            error: profileError ? { message: 'database detail' } : null,
          }),
        };
        return chain;
      },
    }),
  };
  const env = {
    SUPABASE_URL: 'https://db.example',
    SUPABASE_ANON_KEY: 'anon-test',
    SUPABASE_SERVICE_ROLE_KEY: 'service-test',
    CODELAH_APP_ORIGIN: origin,
  };
  runInNewContext(code, {
    Request,
    Response,
    URL,
    createClient: (_url, key) =>
      key === 'service-test' ? adminClient : actorClient,
    Deno: {
      env: { get: (key) => env[key] },
      serve: (fn) => {
        handler = fn;
      },
    },
  });
  return {
    invites,
    updates,
    call: (body) =>
      handler(
        new Request('https://db.example/functions/v1/student-accounts', {
          method: 'POST',
          body: JSON.stringify(body),
        }),
      ),
  };
}
const invitation = {
  action: 'invite_adult',
  role: 'parent',
  email: ' Adult@Example.COM ',
  display_name: ' New Parent ',
  redirectTo: 'https://untrusted.example',
};

test('adult invitation uses configured destination and keeps a new account pending', async () => {
  const f = fixture();
  const response = await f.call(invitation);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true,
    account_id: 'invited',
    needs_setup: false,
  });
  assert.deepEqual(f.invites, [
    {
      email: 'adult@example.com',
      redirectTo: 'https://school.example/auth/confirm',
    },
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(f.updates)), [
    {
      table: 'accounts',
      values: { role: 'parent', status: 'pending', display_name: 'New Parent' },
      filters: [
        ['id', 'invited'],
        ['role', 'pending'],
      ],
    },
  ]);
});
test('only active administrators can invite adults', async () => {
  for (const options of [
    { role: 'teacher' },
    { role: 'parent' },
    { role: 'student' },
    { role: 'admin', status: 'suspended' },
    { signedIn: false },
  ]) {
    const f = fixture(options);
    const response = await f.call(invitation);
    assert.equal(response.status, options.signedIn === false ? 401 : 403);
    assert.equal(f.invites.length, 0);
  }
});
test('invitation rejects invalid roles, emails and missing or insecure deployment origins', async () => {
  for (const values of [
    { role: 'admin' },
    { email: 'student@students.codelah.invalid' },
    { email: 'a@b@c.com' },
    { email: 'broken' },
    { display_name: '' },
  ]) {
    const f = fixture();
    assert.equal((await f.call({ ...invitation, ...values })).status, 400);
    assert.equal(f.invites.length, 0);
  }
  for (const origin of ['', 'http://school.example']) {
    const f = fixture({ origin });
    assert.equal((await f.call(invitation)).status, 503);
    assert.equal(f.invites.length, 0);
  }
});
test('invitation failures preserve pending review and do not expose provider details', async () => {
  const profile = fixture({ profileError: true });
  assert.deepEqual(await (await profile.call(invitation)).json(), {
    ok: true,
    account_id: 'invited',
    needs_setup: true,
  });
  const provider = fixture({ inviteError: true });
  const response = await provider.call(invitation);
  assert.equal(response.status, 400);
  assert.equal(provider.updates.length, 0);
  assert.ok(!(await response.text()).includes('provider detail'));
});
