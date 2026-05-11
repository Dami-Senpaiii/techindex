import { json, readSignups } from '../../_lib/newsletter.js';

export async function onRequestGet(context) {
  const signups = await readSignups(context.env);
  return json({ signups, persistent: Boolean(context.env.TECHINDEX_ARTICLES || context.env.ARTICLE_STORE || context.env.ARTICLES_KV) });
}
