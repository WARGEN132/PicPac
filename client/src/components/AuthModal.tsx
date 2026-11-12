import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Camera, Eye, EyeOff, X } from 'lucide-react';
import { loginAnonymous, loginUser, registerUser } from '../services/api';
import type { AuthUser } from '../types';

interface AuthModalProps {
  onClose?: () => void;
  onAuthSuccess: (user: AuthUser) => void;
}

const inputClass = 'w-full rounded-xl border border-[#EDE1D5] bg-[#F6EFE6]/50 px-3 py-2.5 text-sm text-[#364C49] focus:border-[#DD5757] focus:outline-none';

export function AuthModal({ onClose, onAuthSuccess }: AuthModalProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState<'account' | 'guest' | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  const authorize = async (kind: 'account' | 'guest', request: () => Promise<AuthUser>) => {
    setPending(kind);
    setError('');
    try {
      onAuthSuccess(await request());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось войти. Попробуйте ещё раз.');
    } finally {
      setPending(null);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const email = String(fields.get('email'));
    const password = String(fields.get('password'));
    void authorize('account', () => mode === 'login'
      ? loginUser(email, password)
      : registerUser({
        email,
        password,
        name: String(fields.get('name')),
        phone: String(fields.get('phone'))
      }));
  };

  return (
    <dialog
      ref={dialog}
      aria-labelledby="auth-title"
      onCancel={event => {
        event.preventDefault();
        if (!pending) onClose?.();
      }}
      className="m-auto w-[calc(100%_-_2rem)] max-w-sm max-h-[calc(100dvh_-_2rem)] overflow-y-auto rounded-[28px] border border-[#EDE1D5] bg-white p-0 text-[#364C49] shadow-2xl backdrop:bg-[#243b37]/70"
    >
      <div className="flex items-start gap-3 bg-[#F6EFE6] px-5 py-5">
        <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#DD5757] text-white">
          <Camera className="size-5" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <h1 id="auth-title" className="text-lg font-extrabold">
            {mode === 'login' ? 'Вход в PicPac' : 'Создать аккаунт'}
          </h1>
          <p className="mt-0.5 text-xs text-[#596c67]">Фотокниги, макеты и заказы в одном месте.</p>
        </div>
        {onClose && (
          <button type="button" aria-label="Закрыть окно входа" disabled={!!pending} onClick={onClose} className="rounded-full p-1 hover:bg-white">
            <X className="size-5" />
          </button>
        )}
      </div>

      <div className="space-y-4 p-5">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-[#F6EFE6] p-1 text-sm font-bold">
          {(['login', 'register'] as const).map(option => (
            <button
              key={option}
              type="button"
              aria-pressed={mode === option}
              disabled={!!pending}
              onClick={() => { setMode(option); setError(''); }}
              className={`rounded-lg py-2 ${mode === option ? 'bg-white shadow-sm' : 'hover:bg-white/60'}`}
            >
              {option === 'login' ? 'Вход' : 'Регистрация'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3" key={mode}>
          {mode === 'register' && (
            <label className="block space-y-1 text-xs font-bold">
              <span>Имя</span>
              <input className={inputClass} name="name" autoComplete="name" maxLength={100} required />
            </label>
          )}
          <label className="block space-y-1 text-xs font-bold">
            <span>Email</span>
            <input className={inputClass} name="email" type="email" autoComplete="username" maxLength={254} required />
          </label>
          <div className="space-y-1">
            <label htmlFor="auth-password" className="block text-xs font-bold">Пароль</label>
            <div className="relative">
              <input
                id="auth-password"
                className={`${inputClass} pr-10`}
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                minLength={mode === 'register' ? 8 : undefined}
                required
              />
              <button
                type="button"
                aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                onClick={() => setShowPassword(value => !value)}
                className="absolute inset-y-0 right-0 px-3 text-[#596c67]"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {mode === 'register' && <p className="text-xs text-[#596c67]">Минимум 8 символов.</p>}
          </div>
          {mode === 'register' && (
            <label className="block space-y-1 text-xs font-bold">
              <span>Телефон (необязательно)</span>
              <input className={inputClass} name="phone" type="tel" autoComplete="tel" maxLength={32} />
            </label>
          )}
          {error && <p role="alert" className="rounded-xl bg-red-50 p-2.5 text-xs text-red-800">{error}</p>}
          <button
            type="submit"
            disabled={!!pending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#B83D3D] py-3 text-sm font-extrabold text-white hover:bg-[#A33232] disabled:opacity-60"
          >
            {pending === 'account' ? 'Подождите…' : mode === 'login' ? 'Войти в аккаунт' : 'Зарегистрироваться'}
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        </form>

        {!onClose && (
          <div className="space-y-2 border-t border-[#EDE1D5] pt-4 text-center">
            <button
              type="button"
              disabled={!!pending}
              onClick={() => void authorize('guest', loginAnonymous)}
              className="w-full rounded-xl bg-[#F6EFE6] py-2.5 text-sm font-bold hover:bg-[#EDE1D5] disabled:opacity-60"
            >
              {pending === 'guest' ? 'Открываем каталог…' : 'Продолжить как гость'}
            </button>
            <p className="text-xs text-[#596c67]">Каталог и предпросмотр доступны без аккаунта.</p>
          </div>
        )}
      </div>
    </dialog>
  );
}
