import { deliveryOptions, toCents } from '../../../shared/checkout';
import { getDatabase } from '../db/database';

type Database = ReturnType<typeof getDatabase>;
type CatalogPrice = { base_price: number; price_modifier: number };
type Promo = {
  id: string;
  discount_percent: number;
  discount_fixed: number;
  min_order_amount: number;
};

export class OrderRequestError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

export function priceOrder(db: Database, body: Record<string, unknown>) {
  const { items, promoCode = '', deliveryMethod = 'europost' } = body;
  if (!Array.isArray(items) || items.length === 0) {
    throw new OrderRequestError('Корзина пуста');
  }
  if (typeof promoCode !== 'string') throw new OrderRequestError('Некорректный промокод');

  const method = deliveryMethod === 'pickup' ? 'pickup_minsk' : deliveryMethod;
  const delivery = deliveryOptions.find(option => option.id === method);
  if (!delivery) throw new OrderRequestError('Неизвестный способ доставки');

  const lookupPrice = db.prepare(`
    SELECT p.base_price, COALESCE(v.price_modifier, 0) AS price_modifier
    FROM products p
    LEFT JOIN product_variants v ON v.product_id = p.id AND v.id = ?
    WHERE p.id = ? AND p.is_active = 1 AND (? IS NULL OR v.id IS NOT NULL)
  `);
  const pricedItems = items.map(item => {
    if (!item || typeof item.productId !== 'string' ||
        !Number.isSafeInteger(item.quantity ?? 1) || (item.quantity ?? 1) < 1 ||
        (item.variantId != null && typeof item.variantId !== 'string')) {
      throw new OrderRequestError('Проверьте товар, вариант и количество');
    }
    const variantId = item.variantId ?? null;
    const price = lookupPrice.get(variantId, item.productId, variantId) as CatalogPrice | undefined;
    if (!price) throw new OrderRequestError('Товар или вариант недоступен');
    const quantity = item.quantity ?? 1;
    const unitCents = toCents(price.base_price + price.price_modifier);
    const lineCents = unitCents * quantity;
    if (!Number.isSafeInteger(lineCents)) throw new OrderRequestError('Слишком большое количество товаров');
    return { ...item, variantId, quantity, unitPrice: unitCents / 100, totalPrice: lineCents / 100, lineCents };
  });

  const subtotalCents = pricedItems.reduce((sum, item) => sum + item.lineCents, 0);
  if (!Number.isSafeInteger(subtotalCents)) throw new OrderRequestError('Слишком большая сумма заказа');

  const code = promoCode.trim().toUpperCase();
  const promo = code ? db.prepare(`
    SELECT id, discount_percent, discount_fixed, min_order_amount FROM promo_codes
    WHERE code = ? AND is_active = 1 AND (expires_at IS NULL OR julianday(expires_at) >= julianday('now'))
  `).get(code) as Promo | undefined : undefined;

  const minimumCents = toCents(promo?.min_order_amount ?? 0);
  const eligible = promo && subtotalCents >= minimumCents;
  const discountCents = eligible
    ? Math.min(subtotalCents, promo.discount_percent > 0
      ? Math.round(subtotalCents * (promo.discount_percent / 100))
      : toCents(promo.discount_fixed))
    : 0;

  return {
    items: pricedItems,
    promoCodeId: eligible ? promo.id : null,
    quote: {
      subtotal: subtotalCents / 100,
      deliveryMethod: delivery.id,
      deliveryAmount: delivery.price,
      discountAmount: discountCents / 100,
      totalAmount: (subtotalCents - discountCents + toCents(delivery.price)) / 100,
      promoError: !code || eligible ? null : promo
        ? `Промокод действует от ${(minimumCents / 100).toFixed(2)} BYN`
        : 'Промокод недействителен или истёк'
    }
  };
}
