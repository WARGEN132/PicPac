import React, { useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { deliveryOptions, toCents, type DeliveryMethod } from '../../../shared/checkout';
import { CartItem, CreatedOrder, AuthUser } from '../types';
import { createOrder } from '../services/api';
import {
  X,
  CheckCircle2,
  Truck,
  User,
  ChevronRight,
  ChevronLeft,
  Receipt
} from 'lucide-react';

interface CheckoutModalProps {
  user: AuthUser;
  items: CartItem[];
  subtotal: number;
  discountAmount: number;
  promoCode: string;
  onClose: (completed: boolean) => void;
  onOrderCompleted: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  user,
  items,
  subtotal,
  discountAmount,
  promoCode,
  onClose,
  onOrderCompleted
}) => {
  const [step, setStep] = useState<number>(1); // 1 = Contacts & Delivery, 2 = Payment & Confirm

  const [givenName, ...familyName] = user.name.trim().split(/\s+/);
  const [firstName, setFirstName] = useState(givenName);
  const [lastName, setLastName] = useState(familyName.join(' '));
  const [phone, setPhone] = useState(user.phone ?? '');
  const [email, setEmail] = useState(user.email);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('europost');
  const [deliveryAddress, setDeliveryAddress] = useState(user.address ?? '');
  const [comment, setComment] = useState('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [completedOrder, setCompletedOrder] = useState<CreatedOrder | null>(null);
  const [error, setError] = useState('');
  const pendingRequest = useRef<{ payload: string; key: string } | null>(null);
  const canContinue = firstName.trim() && phone.trim() &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    (deliveryMethod === 'pickup_minsk' || deliveryAddress.trim());

  const selectedDelivery = deliveryOptions.find(d => d.id === deliveryMethod) || deliveryOptions[0];
  const deliveryCost = selectedDelivery.price;
  const finalTotal = (toCents(subtotal) - toCents(discountAmount) + toCents(deliveryCost)) / 100;

  const handleSubmitOrder = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      const orderPayload = {
        contactName: `${firstName} ${lastName}`.trim(),
        contactPhone: phone,
        contactEmail: email,
        deliveryMethod,
        deliveryAddress: deliveryMethod === 'pickup_minsk' ? '' : deliveryAddress.trim(),
        items: items.map(item => ({
          productId: item.productId,
          variantId: item.variantId,
          projectId: item.projectId,
          quantity: item.quantity,
          snapshot: {
            title: item.productName,
            variant: item.variantName,
            details: item.details,
            document: item.document,
            photos: item.photos
          }
        })),
        promoCode,
        comment
      };

      const payload = JSON.stringify(orderPayload);
      if (pendingRequest.current?.payload !== payload) {
        pendingRequest.current = { payload, key: uuidv4() };
      }
      const result = await createOrder(orderPayload, pendingRequest.current.key);
      setCompletedOrder(result);
      onOrderCompleted();
    } catch (err: any) {
      setError(err.message);
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
              {completedOrder ? 'Тестовый заказ сохранён' : `Шаг ${step} из 2 • Доставка и подтверждение`}
            </p>
          </div>
          {!completedOrder && (
            <button
              type="button"
              onClick={() => onClose(false)}
              aria-label="Закрыть оформление"
              disabled={isSubmitting}
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
                  <span className="text-[#DD5757] font-extrabold">{completedOrder.totalAmount.toFixed(2)} BYN</span>
                </div>
              </div>

              <p className="text-xs text-[#7C807F]">Статус заказа доступен в профиле.</p>
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
                      type="tel"
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

                {deliveryMethod !== 'pickup_minsk' && (
                  <label className="text-[11px] text-[#7C807F] block">
                    {deliveryMethod === 'courier' ? 'Адрес доставки' : 'Адрес или номер отделения'}
                    <textarea
                      rows={2}
                      value={deliveryAddress}
                      onChange={e => setDeliveryAddress(e.target.value)}
                      className="mt-1 w-full bg-[#F6EFE6]/40 border border-[#BCBFB7]/60 rounded-xl p-2 text-xs text-[#364C49] font-medium"
                    />
                  </label>
                )}
              </div>
            </div>
          ) : (
            /* STEP 2: PAYMENT & CONFIRMATION */
            <div className="space-y-4 animate-fadeIn">
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

              <p className="rounded-xl bg-[#F6EFE6] p-3 text-xs text-[#364C49]">
                Это тестовый заказ. Оплата и отправка отключены.
              </p>
              {error && <p role="alert" className="px-1 text-xs font-bold text-red-700">{error}</p>}
            </div>
          )}
        </div>

        {/* Footer controls */}
        <div className="bg-white border-t border-[#BCBFB7]/40 p-3 flex items-center justify-between">
          {completedOrder ? (
            <button
              type="button"
              onClick={() => onClose(true)}
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
                disabled={!canContinue}
                className="disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2.5 rounded-xl bg-[#364C49] text-white text-xs font-bold flex items-center space-x-1 cursor-pointer"
              >
                <span>Проверить заказ</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={isSubmitting}
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
