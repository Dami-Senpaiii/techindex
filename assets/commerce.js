export const money = minor => new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF' }).format(minor / 100);
export const transit = option => `${option.days[0]}–${option.days[1]} ${option.dayType === 'business' ? 'Werktage' : 'Kalendertage'}`;

// Compare the upper estimate first. Business-day estimates are normalised to
// calendar weeks for comparison; the original supplier range stays visible.
export function shippingChoices(shipping) {
  const options = shipping?.options || [];
  const duration = (option, index) => option.days[index] * (option.dayType === 'business' ? 7 / 5 : 1);
  return {
    cheapest: [...options].sort((a, b) => a.costMinor - b.costMinor || duration(a, 1) - duration(b, 1))[0],
    fastest: shipping?.complete ? [...options].sort((a, b) => duration(a, 1) - duration(b, 1) || duration(a, 0) - duration(b, 0) || a.costMinor - b.costMinor)[0] : undefined,
  };
}
export function variantItem(product, variant) {
  return { sku: variant.sku, name: product.name, variant: variant.name.replace(product.name + ' · ', ''), image: variant.image || product.image, status: product.status, priceMinor: variant.priceMinor, shipping: variant.shipping };
}
export const subtotal = items => items.reduce((sum, item) => sum + item.priceMinor * item.quantity, 0);
