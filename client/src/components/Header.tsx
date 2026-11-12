import React from 'react';
import { Camera, ShoppingBag, PhoneCall, ShieldCheck, User } from 'lucide-react';

interface HeaderProps {
  currentTab: string;
  cartCount: number;
  cartTotal?: number;
  onOpenCart: () => void;
  isOperator?: boolean;
  onToggleOperator?: () => void;
  onOpenAuth?: () => void;
  userName?: string;
  userRole?: string;
}

export const Header: React.FC<HeaderProps> = ({
  cartCount,
  onOpenCart,
  isOperator = false,
  onToggleOperator,
  onOpenAuth,
  userName,
  userRole
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#EDE1D5] text-[#364C49] px-3.5 py-2.5 shadow-xs">
      <div className="flex items-center justify-between">
        {/* Brand Logo & Tagline */}
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-[#DD5757] flex items-center justify-center text-white shadow-xs">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-1">
              <span className="font-extrabold text-base tracking-tight text-[#364C49] font-comfortaa">
                picPac<span className="text-[#DD5757]">.by</span>
              </span>
            </div>
            <p className="text-[10px] text-[#7A8C88] leading-tight">
              Печать в Великом камне
            </p>
          </div>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center space-x-2">
          {/* User Auth Badge / Login & Switcher */}
          {onOpenAuth && (
            <button
              type="button"
              onClick={onOpenAuth}
              title="Вход / Регистрация в БД / Смена роли"
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                isOperator
                  ? 'bg-[#364C49] text-white border-[#364C49]'
                  : userRole === 'guest'
                  ? 'bg-[#EDE1D5] text-[#364C49] border-[#EDE1D5]'
                  : 'bg-[#F6EFE6] text-[#364C49] border-[#EDE1D5] hover:border-[#364C49]'
              }`}
            >
              {isOperator ? (
                <>
                  <ShieldCheck className="w-3 h-3 text-[#7AA45A]" />
                  <span>Оператор</span>
                </>
              ) : userRole === 'guest' ? (
                <>
                  <User className="w-3 h-3 text-[#7A8C88]" />
                  <span>Гость</span>
                </>
              ) : (
                <>
                  <User className="w-3 h-3 text-[#DD5757]" />
                  <span>{userName ? userName.split(' ')[0] : 'Клиент'}</span>
                </>
              )}
            </button>
          )}

          {/* Hotline */}
          <a
            href="tel:+375172001122"
            className="p-1.5 rounded-full bg-[#F6EFE6] text-[#364C49] hover:bg-[#EDE1D5] transition-all border border-[#EDE1D5]"
            title="Горячая линия лаборатории: +375 17 200-11-22"
          >
            <PhoneCall className="w-3.5 h-3.5 text-[#DD5757]" />
          </a>

          {/* Prominent Shopping Cart Button */}
          <button
            type="button"
            onClick={onOpenCart}
            aria-label="Открыть корзину заказа"
            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-full transition-all cursor-pointer font-bold text-xs ${
              cartCount > 0
                ? 'bg-[#DD5757] text-white shadow-sm shadow-[#DD5757]/30 hover:bg-[#c94b4b] active:scale-95'
                : 'bg-[#F6EFE6] text-[#364C49] hover:bg-[#EDE1D5] border border-[#EDE1D5]'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span className="text-[11px]">Корзина</span>
            {cartCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-white text-[#DD5757] text-[10px] font-black">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

