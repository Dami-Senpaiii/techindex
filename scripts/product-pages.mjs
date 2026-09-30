import { money, shippingChoices, transit } from '../assets/commerce.js';
import { productPath, productSubtitle } from '../assets/catalogue.js';
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
export function renderProductPage(template, product) {
  const variant = product.variants.find(v => v.sku === product.defaultSku) || product.variants[0];
  const detail = variant.details || product.details;
  const choices = shippingChoices(variant.shipping);
  const shipping = [['cheapest','Günstigste Lieferung'],['fastest','Schnellste Lieferung']].map(([key,label]) => {
    const option = choices[key];
    return `<div class="shipping-option"><div class="shipping-option-heading"><strong>${label}</strong><strong>${option ? escapeHtml(money(option.costMinor)) : 'Noch offen'}</strong></div><p>${option ? escapeHtml(`${option.method} · ${transit(option)}${variant.shipping.quantity > 1 ? ` (für ${variant.shipping.quantity} Stück)` : ''}`) : 'Tarif noch offen'}</p></div>`;
  }).join('') + `<div class="shipping-option shipping-option-heading"><strong>Bearbeitungsdauer</strong><strong>${variant.shipping.processingDays ? variant.shipping.processingDays.join('–')+' Tage' : 'Wird bestätigt'}</strong></div>`;
  const details = detail.paragraphs.map(text => `<p>${escapeHtml(text)}</p>`).join('')
    + '<dl class="detail-specs">' + [...(variant.memory ? [['Arbeitsspeicher',`${variant.ramGB} GB RAM`],['Interner Speicher',variant.storage]] : []), ...detail.specifications, ['Ausführung',variant.name], ['Artikelnummer',variant.sku]].map(([key,value]) => `<div><dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('') + '</dl>'
    + (detail.included?.length ? '<h4>Lieferumfang</h4><ul>'+detail.included.map(text=>`<li>${escapeHtml(text)}</li>`).join('')+'</ul>' : '');
  const category = {handhelds:'Handhelds',controller:'Controller',kabel:'Kabel',beamer:'Beamer',peripherie:'Peripherie'}[product.category];
  const text = {title:product.name,description:detail.paragraphs[0],canonical:'https://techindex.ch'+productPath(product),image:variant.image,id:product.id,category,categoryUrl:`/?kategorie=${product.category}#shop`,variantName:variant.name,variantLabel:variant.name.replace(product.name+' · ',''),subtitle:productSubtitle(product),price:money(variant.priceMinor)};
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => key === 'details' ? details : key === 'shipping' ? shipping : escapeHtml(text[key]));
}
