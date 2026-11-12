import { deliveryOptions } from '../../../shared/checkout';
import React, { useState } from 'react';
import { Order, AuthUser } from '../types';
import { purgeUserData } from '../services/api';
import {
  PackageCheck,
  Truck,
  Printer,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  ShieldCheck,
  Trash2,
  PhoneCall,
  MapPin,
  ChevronRight,
  MessageSquare,
  Settings,
  Bell,
  User,
  Shield,
  Edit2
} from 'lucide-react';

interface DeliveryTrackerProps {
  orders: Order[];
  currentUser: AuthUser;
  onOpenSupport: (order: Order) => void;
  onRefresh: () => void;
}

const STEPS = [
  { id: 'received', label: 'Принят', icon: Clock },
  { id: 'moderation', label: 'На проверке', icon: Shield },
  { id: 'production', label: 'В печати', icon: Printer },
  { id: 'ready_for_delivery', label: 'Готов к выдаче', icon: PackageCheck },
  { id: 'completed', label: 'Завершён', icon: CheckCircle2 }
];

function statusLabel(status: Order['status']) {
  return status === 'cancelled' ? 'Отменён' : STEPS.find(step => step.id === status)?.label;
}

export const DeliveryTracker: React.FC<DeliveryTrackerProps> = ({
  orders,
  currentUser,
  onOpenSupport,
  onRefresh
}) => {
  const [selectedOrderId, setSelectedOrderId] = useState<string>(orders[0]?.id || '');
  const [copiedTrack, setCopiedTrack] = useState<boolean>(false);
  const [isPurging, setIsPurging] = useState<boolean>(false);
  const [purgeMessage, setPurgeMessage] = useState<string | null>(null);

  const { name: userName, phone: userPhone, email: userEmail } = currentUser;
  const [userAddress, setUserAddress] = useState(currentUser.address ?? '');
  const [isEditingAddress, setIsEditingAddress] = useState<boolean>(false);
  const [smsNotifications, setSmsNotifications] = useState<boolean>(true);
  const [autoPurgePhotos, setAutoPurgePhotos] = useState<boolean>(true);

  // Active order to inspect
  const activeOrder = orders.find(o => o.id === selectedOrderId) || orders[0];

  const currentStepIdx = STEPS.findIndex(step => step.id === activeOrder?.status);
  const isCancelled = activeOrder?.status === 'cancelled';
  const delivery = deliveryOptions.find(option => option.id === activeOrder?.deliveryMethod);

  const handleCopyTrack = (trackCode: string) => {
    navigator.clipboard.writeText(trackCode);
    setCopiedTrack(true);
    setTimeout(() => setCopiedTrack(false), 2000);
  };

  const handlePurgeData = async () => {
    if (!confirm('Удалить фотографии и черновики из приложения? Это действие нельзя отменить.')) {
      return;
    }
    try {
      setIsPurging(true);
      const msg = await purgeUserData();
      setPurgeMessage(msg);
      setTimeout(() => {
        setPurgeMessage(null);
        onRefresh();
      }, 3500);
    } catch (err: any) {
      alert('Ошибка при очистке данных: ' + err.message);
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn pb-6">
      
      {/* 1. USER PROFILE CARD */}
      <div className="bg-white rounded-3xl p-4.5 border border-[#EDE1D5] craft-shadow flex items-center justify-between">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#364C49] text-white flex items-center justify-center font-extrabold text-base shadow-xs font-comfortaa">
            {userName
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map(w => w[0].toUpperCase())
              .join('') || 'ПП'}
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h2 className="font-extrabold text-base text-[#364C49] leading-tight font-comfortaa">
                {userName}
              </h2>
            </div>
            <p className="text-xs text-[#7A8C88] mt-0.5">
              {[userPhone, userEmail].filter(Boolean).join(' • ')}
            </p>
          </div>
        </div>

      </div>

      {/* 2. MAIN ACTIVE ORDER DELIVERY PIPELINE */}
      {activeOrder ? (
        <div className="bg-white rounded-3xl p-5 border border-[#BCBFB7]/40 shadow-sm space-y-5">
          {/* Status Header Badge */}
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-[#7C807F] uppercase tracking-wide block">
                Отслеживание доставки
              </span>
              <h3 className="text-lg font-black text-[#364C49] mt-0.5">
                Заказ #{activeOrder.orderNumber}
              </h3>
            </div>

            <span className={`px-3 py-2 rounded-2xl font-bold text-xs text-white
              ${isCancelled ? 'bg-red-700' : activeOrder.status === 'completed' ? 'bg-emerald-600' : 'bg-[#364C49]'}`}>
              {statusLabel(activeOrder.status)}
            </span>
          </div>

          {!isCancelled && <div className="pt-1">
            <div className="relative">
              {/* Background Connecting Line */}
              <div className="absolute top-4 left-6 right-6 h-1 bg-[#F6EFE6] -z-0">
                <div
                  className="h-full bg-[#DD5757] transition-all duration-500 rounded-full"
                  style={{ width: `${(currentStepIdx / (STEPS.length - 1)) * 100}%` }}
                />
              </div>

              {/* Steps */}
              <div className="grid grid-cols-5 relative z-10">
                {STEPS.map((step, idx) => {
                  const Icon = step.icon;
                  const isPassed = idx < currentStepIdx;
                  const isCurrent = idx === currentStepIdx;

                  return (
                    <div key={step.id} className="flex flex-col items-center text-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                          isCurrent
                            ? 'bg-[#DD5757] text-white ring-4 ring-[#DD5757]/20 shadow-md scale-110'
                            : isPassed
                            ? 'bg-[#364C49] text-white'
                            : 'bg-white text-[#BCBFB7] border-2 border-[#BCBFB7]'
                        }`}
                      >
                        {isPassed ? (
                          <Check className="w-4 h-4 stroke-[3]" />
                        ) : (
                          <Icon className="w-4 h-4" />
                        )}
                      </div>
                      <span className={`text-[11px] mt-2 leading-tight ${
                        isCurrent
                          ? 'font-black text-[#DD5757]'
                          : isPassed
                          ? 'font-bold text-[#364C49]'
                          : 'text-[#7C807F]'
                      }`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>}

          {/* Address and tracking */}
          <div className="bg-[#F6EFE6] rounded-2xl p-4 space-y-3 text-xs border border-[#BCBFB7]/40">
            <div className="flex items-start space-x-2.5">
              <MapPin className="w-4 h-4 text-[#DD5757] shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold text-[#364C49] block text-xs">
                  {delivery?.name ?? 'Доставка'}
                </span>
                <span className="text-[#7C807F] text-xs mt-0.5 block">
                  {activeOrder.deliveryAddress || (activeOrder.deliveryMethod === 'pickup_minsk' ? 'Адрес уточняется' : 'Адрес не указан')}
                </span>
              </div>
            </div>

            {activeOrder.trackingNumber && (
              <div className="flex items-center justify-between pt-2 border-t border-[#BCBFB7]/30">
                <span className="text-[#7C807F] text-xs">Трек-номер</span>
                <button
                  type="button"
                  onClick={() => handleCopyTrack(activeOrder.trackingNumber!)}
                  className="flex items-center gap-1.5 font-mono font-bold text-[#364C49] bg-white px-3 py-1.5 rounded-xl"
                >
                  {activeOrder.trackingNumber}
                  {copiedTrack ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center space-x-2 pt-1">
            <button
              type="button"
              onClick={() => onOpenSupport(activeOrder)}
              className="flex-1 py-3 rounded-xl bg-white border border-[#BCBFB7]/60 hover:bg-[#F6EFE6] text-[#364C49] text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-[#DD5757]" />
              <span>Вопрос по заказу</span>
            </button>

            <a
              href="tel:+375172001122"
              className="px-4 py-3 rounded-xl bg-[#364C49] text-white text-xs font-bold flex items-center space-x-1.5 hover:bg-[#283836] transition-colors"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Позвонить</span>
            </a>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-6 text-center border border-[#BCBFB7]/40 space-y-2">
          <p className="text-xs text-[#7C807F]">У вас пока нет оформленных заказов.</p>
        </div>
      )}

      {/* 3. ORDER HISTORY ACCORDION / SELECTION */}
      {orders.length > 1 && (
        <div className="space-y-2">
          <h3 className="text-xs font-extrabold text-[#7C807F] uppercase tracking-wider px-1">
            История заказов ({orders.length})
          </h3>
          <div className="space-y-2">
            {orders.map(order => {
              const isSelected = order.id === (activeOrder?.id);
              const isCompleted = order.status === 'completed';

              return (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrderId(order.id)}
                  className={`bg-white rounded-2xl p-3.5 border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'border-[#DD5757] ring-1 ring-[#DD5757]/30 shadow-xs'
                      : 'border-[#BCBFB7]/40 hover:border-[#364C49]'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white ${
                      isCompleted ? 'bg-emerald-600' : 'bg-[#364C49]'
                    }`}>
                      {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Truck className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-xs text-[#364C49]">
                          Заказ #{order.orderNumber}
                        </span>
                        <span className="text-[11px] text-[#7C807F]">
                          {new Date(order.createdAt).toLocaleDateString('ru-RU')}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-[#DD5757] block mt-0.5">
                        {order.totalAmount.toFixed(2)} BYN • {statusLabel(order.status)}
                      </span>
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-[#7C807F]" />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. SETTINGS & DEFAULT ADDRESS */}
      <div className="bg-white rounded-3xl p-5 border border-[#BCBFB7]/40 shadow-xs space-y-4">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-[#F6EFE6] text-[#364C49] flex items-center justify-center">
            <Settings className="w-4 h-4" />
          </div>
          <h3 className="font-extrabold text-sm text-[#364C49]">
            Настройки и адрес доставки
          </h3>
        </div>

        {/* Address card */}
        <div className="bg-[#F6EFE6] p-3.5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-[#364C49]">Адрес получения по умолчанию</span>
            <button
              type="button"
              onClick={() => setIsEditingAddress(!isEditingAddress)}
              className="text-xs text-[#DD5757] font-bold hover:underline flex items-center space-x-1 cursor-pointer"
            >
              <Edit2 className="w-3 h-3" />
              <span>{isEditingAddress ? 'Сохранить' : 'Изменить'}</span>
            </button>
          </div>
          {isEditingAddress ? (
            <input
              type="text"
              value={userAddress}
              onChange={(e) => setUserAddress(e.target.value)}
              className="w-full bg-white border border-[#BCBFB7]/60 rounded-xl px-3 py-1.5 text-xs text-[#364C49] font-medium focus:outline-none focus:border-[#DD5757]"
            />
          ) : (
            <p className="text-xs text-[#7C807F] leading-snug">
              {userAddress}
            </p>
          )}
        </div>

        {/* Toggles */}
        <div className="space-y-3 pt-1 text-xs">
          {/* SMS Status Updates */}
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="font-bold text-[#364C49] block text-xs">SMS-уведомления о доставке</span>
              <span className="text-[#7C807F] text-[11px]">Бесплатные оповещения при смене статуса посылки</span>
            </div>
            <input
              type="checkbox"
              checked={smsNotifications}
              onChange={e => setSmsNotifications(e.target.checked)}
              className="w-4 h-4 accent-[#DD5757] rounded cursor-pointer"
            />
          </label>

          {/* Privacy auto-clean */}
          <label className="flex items-center justify-between cursor-pointer pt-2 border-t border-[#BCBFB7]/30">
            <div>
              <span className="font-bold text-[#364C49] block text-xs">Авто-очистка загруженных фото</span>
              <span className="text-[#7C807F] text-[11px]">Удалять исходники через 14 дней после вручения заказа</span>
            </div>
            <input
              type="checkbox"
              checked={autoPurgePhotos}
              onChange={e => setAutoPurgePhotos(e.target.checked)}
              className="w-4 h-4 accent-[#DD5757] rounded cursor-pointer"
            />
          </label>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-5 border border-[#BCBFB7]/40 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#364C49]" />
          <h3 className="font-extrabold text-sm text-[#364C49]">Данные макетов</h3>
        </div>

        <div className="pt-2 border-t border-[#BCBFB7]/30">
          <button
            type="button"
            onClick={handlePurgeData}
            disabled={isPurging}
            className="w-full py-3 px-3 rounded-2xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs flex items-center justify-center space-x-2 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
            <span>{isPurging ? 'Удаление данных...' : 'Удалить мои черновики и их фотографии'}</span>
          </button>
          {purgeMessage && (
            <div className="mt-2 p-2.5 bg-emerald-50 text-emerald-800 text-xs rounded-xl flex items-center space-x-1.5 border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{purgeMessage}</span>
            </div>
          )}
        </div>
      </div>

      {/* 6. HOTLINE CALL BOX */}
      <div className="bg-[#364C49] text-white rounded-3xl p-5 shadow-sm space-y-2.5">
        <div className="flex items-center space-x-2">
          <PhoneCall className="w-5 h-5 text-[#DD5757]" />
          <h3 className="font-black text-sm">
            Лаборатория ООО «Фотопринт»
          </h3>
        </div>
        <p className="text-xs text-white/80 leading-relaxed">
          Минск, ул. Октябрьская, 16. Производство и выдача заказов пн–сб с 9:00 до 20:00.
        </p>
        <a
          href="tel:+375172001122"
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#DD5757] hover:bg-[#c94b4b] text-white text-xs font-black transition-colors"
        >
          <PhoneCall className="w-4 h-4" />
          <span>+375 17 200-11-22</span>
        </a>
      </div>

    </div>
  );
};
