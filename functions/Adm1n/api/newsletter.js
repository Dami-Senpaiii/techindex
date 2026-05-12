import { getStore, json, readSignups } from '../../_lib/newsletter.js';

export async function onRequestGet(context) {
  const signups = await readSignups(context.env);
  return json({ signups, persistent: Boolean(getStore(context.env)) });
}
