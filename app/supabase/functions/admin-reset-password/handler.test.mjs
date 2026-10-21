import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeHandler } from './handler.mjs';
const id = '12345678-1234-1234-1234-123456789abc';
function setup({ role = 'Admin', active = true, valid = true, target = true, updateError = null } = {}) {
  const calls = [];
  const client = {
    auth: { getUser: async () => ({ data: { user: valid ? { id } : null } }), admin: { updateUserById: async (...args) => { calls.push(args); return { error: updateError }; } } },
    from: () => ({ select: (fields) => ({ eq: () => ({ single: async () => fields === 'role,active' ? { data: { role, active } } : { error: target ? null : new Error('missing') } }) }) }),
  };
  return { calls, handle: makeHandler(client, {}) };
}
function request(body = { userId: id, password: 'test-password-123' }, token = 'valid') {
  return new Request('http://test', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: JSON.stringify(body) });
}
for (const options of [{ role: 'Office Staff' }, { active: false }, { valid: false }]) {
  test(`rejects unauthorized caller ${JSON.stringify(options)}`, async () => {
    const { handle, calls } = setup(options);
    assert.ok([401, 403].includes((await handle(request())).status));
    assert.equal(calls.length, 0);
  });
}
test('rejects missing token and invalid input', async () => {
  const { handle, calls } = setup();
  assert.equal((await handle(request({}, ''))).status, 401);
  assert.equal((await handle(request({ userId: id, password: 'short' }))).status, 400);
  assert.equal((await handle(request({ userId: 'bad', password: 'long-password' }))).status, 400);
  assert.equal(calls.length, 0);
});
test('rejects missing target', async () => {
  const { handle, calls } = setup({ target: false });
  assert.equal((await handle(request())).status, 404);
  assert.equal(calls.length, 0);
});
test('updates only requested user and does not return password', async () => {
  const { handle, calls } = setup();
  const response = await handle(request());
  assert.equal(response.status, 200);
  assert.deepEqual(calls, [[id, { password: 'test-password-123' }]]);
  assert.deepEqual(await response.json(), { success: true });
});
test('returns failure when auth rejects password', async () => {
  const { handle } = setup({ updateError: { message: 'Weak password' } });
  assert.equal((await handle(request())).status, 400);
});
