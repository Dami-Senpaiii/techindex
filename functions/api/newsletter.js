import { isValidEmail, json, normalizeEmail, readSignups, writeSignups } from '../_lib/newsletter.js';

export async function onRequestPost(context) {
  const contentType = context.request.headers.get('Content-Type') || '';
  let email = '';

  if (contentType.includes('application/json')) {
    const body = await context.request.json().catch(() => ({}));
    email = normalizeEmail(body.email);
  } else {
    const form = await context.request.formData().catch(() => null);
    email = normalizeEmail(form && form.get('email'));
  }

  const wantsJson = (context.request.headers.get('Accept') || '').includes('application/json');
  if (!isValidEmail(email)) {
    if (wantsJson) return json({ error: 'Invalid email.' }, { status: 400 });
    return redirect('/?newsletter=invalid#techindex-weekly');
  }

  const signups = await readSignups(context.env);
  const existing = signups.find((signup) => signup.email === email);
  const now = new Date().toISOString();
  const nextSignups = existing
    ? signups.map((signup) => signup.email === email ? { ...signup, updatedAt: now } : signup)
    : [{ email, createdAt: now, updatedAt: now }, ...signups];
  const persistent = await writeSignups(context.env, nextSignups);

  if (!persistent) {
    if (wantsJson) return json({ error: 'Newsletter storage is not configured.', ok: false, persistent }, { status: 503 });
    return redirect('/?newsletter=unavailable#techindex-weekly');
  }

  if (wantsJson) return json({ ok: true, persistent });
  return redirect('/?newsletter=ok#techindex-weekly');
}

function redirect(location) {
  return new Response(null, { status: 303, headers: { Location: location, 'Cache-Control': 'no-store' } });
}
