export function makeHandler(client, cors) {
  const reply = (status, body) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
  return async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
    if (req.method !== 'POST') return reply(405, { error: 'Method not allowed' });
    const token = req.headers.get('Authorization')?.match(/^Bearer (.+)$/i)?.[1];
    if (!token) return reply(401, { error: 'Sign in to continue' });
    try {
      const { data, error } = await client.auth.getUser(token);
      if (error || !data?.user) return reply(401, { error: 'Sign in to continue' });
      const { data: profile, error: profileError } = await client.from('profiles').select('role,active').eq('id', data.user.id).single();
      if (profileError || !profile?.active || profile.role !== 'Admin') return reply(403, { error: 'Only an active Admin can reset passwords' });
      let body;
      try { body = await req.json(); } catch { return reply(400, { error: 'Invalid request' }); }
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.userId || '') || typeof body.password !== 'string' || body.password.length < 8 || body.password.length > 128) {
        return reply(400, { error: 'Choose a user and a password between 8 and 128 characters' });
      }
      const { error: targetError } = await client.from('profiles').select('id').eq('id', body.userId).single();
      if (targetError) return reply(404, { error: 'User not found' });
      const { error: updateError } = await client.auth.admin.updateUserById(body.userId, { password: body.password });
      if (updateError) return reply(400, { error: updateError.message });
      return reply(200, { success: true });
    } catch { return reply(500, { error: 'Password could not be updated. Try again.' }); }
  };
}
