import { STORE_BINDINGS, getArticleStore, json } from '../../_lib/articles.js';
import { STORE_BINDINGS as NEWSLETTER_BINDINGS, getStore as getNewsletterStore } from '../../_lib/newsletter.js';

export async function onRequestGet(context) {
  const envKeys = Object.keys(context.env || {}).sort();

  return json({
    env: {
      keys: envKeys,
      types: Object.fromEntries(envKeys.map((name) => [name, typeof context.env[name]])),
    },
    articles: {
      persistent: Boolean(getArticleStore(context.env)),
      checkedBindings: STORE_BINDINGS,
      bindings: describeBindings(context.env, STORE_BINDINGS),
    },
    newsletter: {
      persistent: Boolean(getNewsletterStore(context.env)),
      checkedBindings: NEWSLETTER_BINDINGS,
      bindings: describeBindings(context.env, NEWSLETTER_BINDINGS),
    },
  });
}

function describeBindings(env, names) {
  return Object.fromEntries(
    names.map((name) => [name, describeBinding(env[name])]),
  );
}

function describeBinding(binding) {
  const type = typeof binding;

  return {
    present: binding !== undefined && binding !== null,
    type,
    hasGet: Boolean(binding && typeof binding.get === 'function'),
    hasPut: Boolean(binding && typeof binding.put === 'function'),
  };
}
