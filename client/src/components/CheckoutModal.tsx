import React, { useState } from 'react';
import { CartItem, Order } from '../types';
import { createOrder } from '../services/api';
import {
  X,
  CheckCircle2,
  Truck,
  CreditCard,
  User,
  MapPin,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  Receipt
} from 'lucide-react';

interface CheckoutModalProps {
  items: CartItem[];
  subtotal: number;
  discountAmount: number;
  promoCode: string;
  onClose: () => void;
  onOrderCompleted: (order: any) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  items,
  subtotal,
  discountAmount,
  promoCode,
  onClose,
  onOrderCompleted
}) => {
  const [step, setStep] = useState<number>(1); // 1 = Contacts & Delivery, 2 = Payment & Confirm

  // Contact info
  const [firstName, setFirstName] = useState<string>('Иван');
  const [lastName, setLastName] = useState<string>('Радкевич');
  const [phone, setPhone] = useState<string>('+375 29 123-45-67');
  const [email, setEmail] = useState<string>('customer@test.by');

  // Delivery options (Exact brandbook tariffs & options)
  const deliveryOptions = [
    { id: 'pickup', name: 'Самовывоз из лаборатории (Минск / Великий камень)', price: 0.0, days: 'Сегодня / завтра' },
    { id: 'europost', name: 'Европочта (до отделения по всей РБ)', price: 5.90, days: '2-3 дня' },
    { id: 'belpost', name: 'Белпочта (почтовое отделение с трекингом)', price: 6.90, days: '2-4 дня' },
    { id: 'courier', name: 'Курьерская доставка до двери (Минск)', price: 9.90, days: '1-2 дня' }
  ];
  const [deliveryMethod, setDeliveryMethod] = useState<string>('europost');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('г. Минск, пр-т Дзержинского, 104 (Отделение Европочты № 422)');
  const [paymentMethod, setPaymentMethod] = useState<'erip' | 'card'>('erip');
  const [comment, setComment] = useState<string>('Проверить цветопробу перед ламинированием');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [completedOrder, setCompletedOrder] = useState<any | null>(null);

  const selectedDelivery = deliveryOptions.find(d => d.id === deliveryMethod) || deliveryOptions[0];
  const deliveryCost = selectedDelivery.price;
  const finalTotal = Math.max(0, Math.round((subtotal - discountAmount + deliveryCost) * 100) / 100);

  const handleSubmitOrder = async () => {
    setIsSubmitting(true);
    const idempotencyKey = `idemp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    try {
      const orderPayload = {
        userId: 'usr-test-customer-001',
        contactName: `${firstName} ${lastName}`.trim(),
        contactPhone: phone,
        contactEmail: email,
        deliveryMethod,
        deliveryAddress,
        items: items.map(item => ({
          productId: item.productId,
          variantId: item.variantId,
          projectId: item.projectId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          snapshot: {
            title: item.productName,
            variant: item.variantName,
            details: item.details
          }
        })),
        promoCode,
        comment
      };

      const result = await createOrder(orderPayload, idempotencyKey);
      setCompletedOrder(result);
      onOrderCompleted(result);
    } catch (err: any) {
      alert('Ошибка при оформлении заказа: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#364C49]/50 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-md h-full sm:h-[90vh] bg-white sm:rounded-[36px] flex flex-col shadow-2xl overflow-hidden border border-[#EDE1D5]">
        
        {/* Header */}
        <div className="bg-white border-b border-[#EDE1D5] px-4 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-extrabold text-[#364C49]">
              {completedOrder ? 'Заказ успешно принят' : 'Оформление заказа'}
            </h2>
            <p className="text-[11px] text-[#7A8C88]">
              {completedOrder ? 'Передан в печатный цех ООО «Фотопринт»' : `Шаг ${step} из 2 • Доставка и оплата в BYN`}
            </p>
          </div>
          {!completedOrder && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-[#7A8C88] hover:bg-[#F6EFE6] hover:text-[#364C49] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F6EFE6]/30">

          {/* SUCCESS SCREEN */}
          {completedOrder ? (
            <div className="py-6 px-3 flex flex-col items-center text-center space-y-4 animate-fadeIn">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <span className="text-xs uppercase font-extrabold tracking-wider text-[#7C807F] block">
                  Номер вашего заказа:
                </span>
                <span className="text-2xl font-black text-[#364C49] block mt-0.5">
                  {completedOrder.orderNumber}
                </span>
                <span className="text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 inline-block mt-2 font-bold">
                  Статус: Принят в обработку
                </span>
              </div>

              <div className="w-full bg-white rounded-2xl p-4 border border-[#BCBFB7]/50 text-left space-y-2 text-xs">
                <div className="flex justify-between border-b border-[#BCBFB7]/30 pb-1.5">
                  <span className="text-[#7C807F]">Получатель:</span>
                  <span className="font-bold text-[#364C49]">{firstName} {lastName}</span>
                </div>
                <div className="flex justify-between border-b border-[#BCBFB7]/30 pb-1.5">
                  <span className="text-[#7C807F]">Телефон:</span>
                  <span className="font-bold text-[#364C49]">{phone}</span>
                </div>
                <div className="flex justify-between border-b border-[#BCBFB7]/30 pb-1.5">
                  <span className="text-[#7C807F]">Доставка:</span>
                  <span className="font-bold text-[#364C49]">{selectedDelivery.name}</span>
                </div>
                <div className="flex justify-between pt-1 font-bold text-sm">
                  <span className="text-[#364C49]">Итого к оплате:</span>
                  <span className="text-[#DD5757] font-extrabold">{finalTotal.toFixed(2)} BYN</span>
                </div>
              </div>

              <p className="text-xs text-[#7C807F] max-w-xs leading-relaxed">
                Вы можете отслеживать этапы производства заказа в разделе «Профиль» → «История заказов».
              </p>
            </div>
          ) : step === 1 ? (
            /* STEP 1: CONTACTS & DELIVERY */
            <div className="space-y-4 animate-fadeIn">
              {/* Contacts */}
              <div className="bg-white p-3.5 rounded-2xl border border-[#BCBFB7]/50 space-y-3">
                <span className="text-xs font-bold text-[#364C49] uppercase tracking-wider block">
                  1. Контактные данные получателя:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-[#7C807F] block mb-0.5">Имя</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      className="w-full bg-[#F6EFE6]/40 border border-[#BCBFB7]/60 rounded-xl px-2.5 py-1.5 text-xs text-[#364C49] font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#7C807F] block mb-0.5">Фамилия</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      className="w-full bg-[#F6EFE6]/40 border border-[#BCBFB7]/60 rounded-xl px-2.5 py-1.5 text-xs text-[#364C49] font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-[#7C807F] block mb-0.5">Телефон РБ</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="w-full bg-[#F6EFE6]/40 border border-[#BCBFB7]/60 rounded-xl px-2.5 py-1.5 text-xs text-[#364C49] font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#7C807F] block mb-0.5">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full bg-[#F6EFE6]/40 border border-[#BCBFB7]/60 rounded-xl px-2.5 py-1.5 text-xs text-[#364C49] font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Delivery Methods (Section 15) */}
              <div className="bg-white p-3.5 rounded-2xl border border-[#BCBFB7]/50 space-y-2.5">
                <span className="text-xs font-bold text-[#364C49] uppercase tracking-wider block">
                  2. Способ доставки по Беларуси:
                </span>
                <div className="space-y-1.5">
                  {deliveryOptions.map(opt => {
                    const isSelected = deliveryMethod === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setDeliveryMethod(opt.id)}
                        className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-left text-xs transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#F6EFE6] border-[#DD5757] font-bold text-[#364C49]'
                            : 'bg-white border-[#BCBFB7]/50 text-[#7C807F] hover:border-[#364C49]'
                        }`}
                      >
                        <div>
                          <span className="text-[#364C49] block">{opt.name}</span>
                          <span className="text-[10px] text-[#7C807F]">{opt.days}</span>
                        </div>
                        <span className="font-extrabold text-[#DD5757]">
                          {opt.price.toFixed(2)} BYN
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div>
                  <label className="text-[11px] text-[#7C807F] block mb-1">
                    Адрес доставки или номер отделения:
                  </label>
                  <textarea
                    rows={2}
                    value={deliveryAddress}
                    onChange={e => setDeliveryAddress(e.target.value)}
                    className="w-full bg-[#F6EFE6]/40 border border-[#BCBFB7]/60 rounded-xl p-2 text-xs text-[#364C49] font-medium"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* STEP 2: PAYMENT & CONFIRMATION */
            <div className="space-y-4 animate-fadeIn">
              {/* Payment Methods */}
              <div className="bg-white p-3.5 rounded-2xl border border-[#BCBFB7]/50 space-y-2.5">
                <span className="text-xs font-bold text-[#364C49] uppercase tracking-wider block">
                  3. Способ оплаты:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('erip')}
                    className={`p-3 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer ${
                      paymentMethod === 'erip'
                        ? 'bg-[#F6EFE6] border-[#DD5757] text-[#364C49]'
                        : 'bg-white border-[#BCBFB7]/50 text-[#7C807F]'
                    }`}
                  >
                    <CreditCard className="w-5 h-5 text-[#DD5757] mb-1" />
                    <span>ЕРИП (Беларусь)</span>
                    <span className="text-[10px] text-[#7C807F] block font-normal mt-0.5">Без комиссии</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`p-3 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer ${
                      paymentMethod === 'card'
                        ? 'bg-[#F6EFE6] border-[#DD5757] text-[#364C49]'
                        : 'bg-white border-[#BCBFB7]/50 text-[#7C807F]'
                    }`}
                  >
                    <Receipt className="w-5 h-5 text-[#364C49] mb-1" />
                    <span>Банковская карта</span>
                    <span className="text-[10px] text-[#7C807F] block font-normal mt-0.5">Белкарт / Visa / MC</span>
                  </button>
                </div>
              </div>

              {/* Order summary breakdown */}
              <div className="bg-white p-3.5 rounded-2xl border border-[#BCBFB7]/50 space-y-2 text-xs">
                <span className="text-xs font-bold text-[#364C49] uppercase tracking-wider block border-b border-[#BCBFB7]/30 pb-1.5">
                  Итоговая смета:
                </span>
                <div className="flex justify-between text-[#7C807F]">
                  <span>Сумма товаров ({items.length} поз.):</span>
                  <span className="font-bold text-[#364C49]">{subtotal.toFixed(2)} BYN</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Скидка по промокоду ({promoCode}):</span>
                    <span className="font-bold">- {discountAmount.toFixed(2)} BYN</span>
                  </div>
                )}
                <div className="flex justify-between text-[#7C807F]">
                  <span>Доставка ({selectedDelivery.name.split('(')[0]}):</span>
                  <span className="font-bold text-[#364C49]">{deliveryCost.toFixed(2)} BYN</span>
                </div>
                <div className="flex justify-between border-t border-[#BCBFB7]/40 pt-2 text-sm font-extrabold text-[#364C49]">
                  <span>Итого к оплате:</span>
                  <span className="text-[#DD5757] text-base">{finalTotal.toFixed(2)} BYN</span>
                </div>
              </div>

              {/* Security info */}
              <div className="bg-[#F6EFE6] border border-[#BCBFB7]/40 rounded-xl p-3 flex items-center space-x-2.5 text-xs text-[#364C49]">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="text-[11px] leading-relaxed">
                  Безопасный расчёт по протоколу 3D-Secure 2.0 и ЕРИП. Все персональные данные и фото защищены шифрованием TLS 1.3 / AES-256 (Закон РБ № 99-З).
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer controls */}
        <div className="bg-white border-t border-[#BCBFB7]/40 p-3 flex items-center justify-between">
          {completedOrder ? (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-[#364C49] text-white font-bold text-xs cursor-pointer"
            >
              Перейти к моим заказам
            </button>
          ) : step === 1 ? (
            <>
              <div>
                <span className="text-[11px] text-[#7C807F] block">Предварительно</span>
                <span className="text-base font-extrabold text-[#364C49]">
                  {finalTotal.toFixed(2)} BYN
                </span>
              </div>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-6 py-2.5 rounded-xl bg-[#364C49] text-white text-xs font-bold flex items-center space-x-1 cursor-pointer"
              >
                <span>К оплате</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2.5 rounded-xl border border-[#BCBFB7]/60 text-xs font-bold text-[#364C49] hover:bg-[#F6EFE6] cursor-pointer flex items-center space-x-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Назад</span>
              </button>
              <button
                type="button"
                onClick={handleSubmitOrder}
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-[#DD5757] hover:bg-[#c94b4b] text-white text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-[#DD5757]/20 cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Оформление...</span>
                  </>
                ) : (
                  <span>Подтвердить заказ</span>
                )}
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
};
