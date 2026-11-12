export const deliveryOptions = [
  { id: 'pickup_minsk', name: 'Самовывоз из фотолаборатории', price: 0, days: 'В день готовности' },
  { id: 'europost', name: 'Европочта', price: 5, days: '2–3 дня' },
  { id: 'belpost', name: 'Белпочта', price: 5.5, days: '2–4 дня' },
  { id: 'courier', name: 'Курьер по Минску', price: 8.5, days: '1 рабочий день' }
] as const;

export type DeliveryMethod = typeof deliveryOptions[number]['id'];
export type OrderLine = { productId: string; variantId?: string; quantity: number };

export function toCents(amount: number): number {
  return Math.round(amount * 100);
}
