import { STORE_BINDINGS, getArticleStore, json } from '../../_lib/articles.js';

export async function onRequestGet(context) {
  const bindings = Object.fromEntries(
    STORE_BINDINGS.map((name) => {
      const binding = context.env[name];
      return [name, describeBinding(binding)];
    }),
  );

  return json({
    articles: {
      persistent: Boolean(getArticleStore(context.env)),
      checkedBindings: STORE_BINDINGS,
      bindings,
    },
  });
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
