import React from 'react';
import { Camera, ShoppingBag, PhoneCall, ShieldCheck, LogIn, LogOut } from 'lucide-react';

interface HeaderProps {
  cartCount: number;
  onOpenCart?: () => void;
  isOperator?: boolean;
  onOpenAuth?: () => void;
  onSignOut?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ cartCount, onOpenCart, isOperator, onOpenAuth, onSignOut }) => {
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
          {isOperator && (
            <span className="flex items-center gap-1 rounded-full bg-[#364C49] px-2 py-1 text-[10px] font-bold text-white">
              <ShieldCheck className="size-3" /> Оператор
            </span>
          )}
          {(onOpenAuth || onSignOut) && (
            <button
              type="button"
              onClick={onOpenAuth ?? onSignOut}
              className="flex items-center gap-1 rounded-full border border-[#EDE1D5] bg-[#F6EFE6] px-2.5 py-1.5 text-xs font-bold hover:bg-[#EDE1D5]"
            >
              {onOpenAuth ? <LogIn className="size-3" /> : <LogOut className="size-3" />}
              {onOpenAuth ? 'Войти' : 'Выйти'}
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

          {onOpenCart && <button
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
          </button>}
        </div>
      </div>
    </header>
  );
};

