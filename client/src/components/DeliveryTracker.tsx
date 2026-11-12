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
  Lock,
  CreditCard,
  Trash2,
  PhoneCall,
  MapPin,
  ChevronRight,
  MessageSquare,
  Settings,
  Bell,
  User,
  Shield,
  Edit2,
  LogIn
} from 'lucide-react';

interface DeliveryTrackerProps {
  orders: Order[];
  currentUserId: string;
  onOpenSupport: (order: Order) => void;
  onRefresh: () => void;
  isOperator?: boolean;
  onToggleOperator?: () => void;
  currentUser?: AuthUser | null;
  onOpenAuth?: () => void;
}

const STEPS = [
  { id: 'received', label: 'Принят', icon: Clock },
  { id: 'in_production', label: 'В печати', icon: Printer },
  { id: 'ready', label: 'Готов', icon: PackageCheck },
  { id: 'shipping', label: 'В пути', icon: Truck },
  { id: 'completed', label: 'Доставлен', icon: CheckCircle2 }
];

export const DeliveryTracker: React.FC<DeliveryTrackerProps> = ({
  orders,
  currentUserId,
  onOpenSupport,
  onRefresh,
  isOperator = false,
  onToggleOperator,
  currentUser,
  onOpenAuth
}) => {
  const [selectedOrderId, setSelectedOrderId] = useState<string>(orders[0]?.id || '');
  const [copiedTrack, setCopiedTrack] = useState<boolean>(false);
  const [isPurging, setIsPurging] = useState<boolean>(false);
  const [purgeMessage, setPurgeMessage] = useState<string | null>(null);

  // User details & settings state (from auth or defaults)
  const userName = currentUser?.name || 'Иван Радкевич';
  const userPhone = currentUser?.phone || '+375 (29) 123-45-67';
  const userEmail = currentUser?.email || 'customer@test.by';
  const [userAddress, setUserAddress] = useState<string>(currentUser?.address || 'г. Минск, пр-т Победителей, 10, кв. 42');
  const [isEditingAddress, setIsEditingAddress] = useState<boolean>(false);
  const [smsNotifications, setSmsNotifications] = useState<boolean>(true);
  const [autoPurgePhotos, setAutoPurgePhotos] = useState<boolean>(true);

  // Active order to inspect
  const activeOrder = orders.find(o => o.id === selectedOrderId) || orders[0];

  // Helper to determine step index
  const getStepIndex = (status: string) => {
    switch (status) {
      case 'received': return 0;
      case 'moderation': return 0;
      case 'in_production': return 1;
      case 'ready': return 2;
      case 'shipping': return 3;
      case 'completed': return 4;
      default: return 1;
    }
  };

  const currentStepIdx = activeOrder ? getStepIndex(activeOrder.status) : 3;

  const handleCopyTrack = (trackCode: string) => {
    navigator.clipboard.writeText(trackCode);
    setCopiedTrack(true);
    setTimeout(() => setCopiedTrack(false), 2000);
  };

  const handlePurgeData = async () => {
    if (!confirm('Вы уверены? Это действие безвозвратно удалит все ваши временные фотографии и черновики с серверов лаборатории в соответствии с Законом РБ № 99-З.')) {
      return;
    }
    try {
      setIsPurging(true);
      const msg = await purgeUserData(currentUserId);
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
              {currentUser?.role === 'guest' && (
                <span className="text-[10px] font-bold bg-[#EDE1D5] text-[#364C49] px-2 py-0.2 rounded-full">
                  Гость
                </span>
              )}
            </div>
            <p className="text-xs text-[#7A8C88] mt-0.5">
              {userPhone} • {userEmail}
            </p>
          </div>
        </div>

        {onOpenAuth && (
          <button
            type="button"
            onClick={onOpenAuth}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-full bg-[#F6EFE6] hover:bg-[#EDE1D5] text-[#364C49] font-bold text-xs border border-[#EDE1D5] cursor-pointer transition-all"
            title="Войти под другим пользователем или зарегистрироваться в БД"
          >
            <LogIn className="w-3.5 h-3.5 text-[#DD5757]" />
            <span className="text-[11px]">Аккаунт</span>
          </button>
        )}
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

            {/* High-Contrast Clear Status Badge */}
            <div className={`px-3.5 py-1.5 rounded-2xl font-black text-xs flex items-center space-x-1.5 shadow-xs ${
              currentStepIdx === 4
                ? 'bg-emerald-600 text-white'
                : currentStepIdx === 3
                ? 'bg-[#DD5757] text-white animate-pulse'
                : currentStepIdx === 2
                ? 'bg-amber-600 text-white'
                : 'bg-[#364C49] text-white'
            }`}>
              {currentStepIdx === 4 && <CheckCircle2 className="w-4 h-4" />}
              {currentStepIdx === 3 && <Truck className="w-4 h-4" />}
              {currentStepIdx === 2 && <PackageCheck className="w-4 h-4" />}
              {currentStepIdx < 2 && <Printer className="w-4 h-4" />}
              <span>
                {currentStepIdx === 4
                  ? 'ДОСТАВЛЕН В ПУНКТ'
                  : currentStepIdx === 3
                  ? 'ТОВАР В ПУТИ'
                  : currentStepIdx === 2
                  ? 'ГОТОВ К ОТПРАВКЕ'
                  : currentStepIdx === 1
                  ? 'В ПЕЧАТИ'
                  : 'ПРИНЯТ В РАБОТУ'}
              </span>
            </div>
          </div>

          {/* 5-STEP VISUAL PIPELINE */}
          <div className="pt-1">
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
          </div>

          {/* ETA & Address Box */}
          <div className="bg-[#F6EFE6] rounded-2xl p-4 space-y-3 text-xs border border-[#BCBFB7]/40">
            <div className="flex items-start space-x-2.5">
              <MapPin className="w-4 h-4 text-[#DD5757] shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold text-[#364C49] block text-xs">
                  {activeOrder.deliveryMethod === 'courier' ? 'Курьерская доставка по адресу' : 'Пункт выдачи Европочта'}
                </span>
                <span className="text-[#7C807F] text-xs mt-0.5 block">
                  {activeOrder.deliveryAddress || userAddress}
                </span>
              </div>
            </div>

            {/* Tracking Code */}
            <div className="flex items-center justify-between pt-2 border-t border-[#BCBFB7]/30">
              <span className="text-[#7C807F] text-xs">Трек-номер:</span>
              <button
                type="button"
                onClick={() => handleCopyTrack(activeOrder.trackingNumber || `EP-${activeOrder.orderNumber}-BY`)}
                className="flex items-center space-x-1.5 font-mono font-bold text-xs text-[#364C49] bg-white px-3 py-1.5 rounded-xl border border-[#BCBFB7]/60 hover:border-[#364C49] transition-all cursor-pointer shadow-2xs"
              >
                <span>{activeOrder.trackingNumber || `EP-${activeOrder.orderNumber}-BY`}</span>
                {copiedTrack ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-[#7C807F]" />
                )}
              </button>
            </div>

            {/* Expected Delivery Date */}
            <div className="flex items-center justify-between text-xs pt-1 border-t border-[#BCBFB7]/20">
              <span className="text-[#7C807F]">Ожидаемое получение:</span>
              <span className="font-bold text-[#364C49]">
                {currentStepIdx === 4
                  ? 'Готов к выдаче (срок хранения 10 дней)'
                  : currentStepIdx === 3
                  ? 'Завтра, 12:00 – 16:00'
                  : 'Через 2 рабочих дня'}
              </span>
            </div>
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
              const stepIdx = getStepIndex(order.status);

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
                      stepIdx === 4 ? 'bg-emerald-600' : 'bg-[#364C49]'
                    }`}>
                      {stepIdx === 4 ? <CheckCircle2 className="w-4 h-4" /> : <Truck className="w-4 h-4" />}
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
                        {order.totalAmount.toFixed(2)} BYN • {
                          stepIdx === 4 ? 'Доставлен' : stepIdx === 3 ? 'В пути' : 'В работе'
                        }
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

      {/* 5. SECURITY & DATA PROTECTION (Section 2 & Law 99-Z) */}
      <div className="bg-white rounded-3xl p-5 border border-[#BCBFB7]/40 shadow-xs space-y-4">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-[#364C49]">
              Безопасность и защита данных
            </h3>
            <p className="text-[11px] text-[#7C807F]">
              ООО «Фотопринт» • Соответствие Закону РБ № 99-З
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2.5 text-xs text-[#364C49]">
          <div className="bg-[#F6EFE6] p-3 rounded-2xl flex items-start space-x-2.5">
            <Lock className="w-4 h-4 text-[#364C49] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-xs">Шифрование TLS 1.3 / AES-256</span>
              <span className="text-[11px] text-[#7C807F]">
                Все передаваемые снимки и личные данные шифруются по банковскому стандарту.
              </span>
            </div>
          </div>

          <div className="bg-[#F6EFE6] p-3 rounded-2xl flex items-start space-x-2.5">
            <CreditCard className="w-4 h-4 text-[#364C49] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-xs">Защита платежей ЕРИП и 3D-Secure 2.0</span>
              <span className="text-[11px] text-[#7C807F]">
                Оплата через официальный шлюз. Номера банковских карт не сохраняются.
              </span>
            </div>
          </div>
        </div>

        {/* Purge user data button (GDPR / РБ) */}
        <div className="pt-2 border-t border-[#BCBFB7]/30">
          <button
            type="button"
            onClick={handlePurgeData}
            disabled={isPurging}
            className="w-full py-3 px-3 rounded-2xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs flex items-center justify-center space-x-2 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
            <span>{isPurging ? 'Удаление данных...' : 'Удалить все мои загруженные фото и черновики'}</span>
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

      {/* 7. DISCREET OPERATOR ACCESS (Optional for laboratory testers) */}
      {onToggleOperator && (
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={onToggleOperator}
            className="text-[11px] text-[#7C807F] hover:text-[#364C49] underline cursor-pointer"
          >
            {isOperator ? 'Вернуться в режим покупателя' : 'Служебный вход для сотрудников лаборатории'}
          </button>
        </div>
      )}

    </div>
  );
};
