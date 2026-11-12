import React, { useState } from 'react';
import { AuthUser } from '../types';
import { loginUser, registerUser, loginAnonymous } from '../services/api';
import {
  X,
  User,
  ShieldCheck,
  Lock,
  Mail,
  Phone,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: AuthUser) => void;
  currentUser?: AuthUser | null;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  currentUser
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState<string>('customer@test.by');
  const [password, setPassword] = useState<string>('Customer123!');
  const [name, setName] = useState<string>('Иван Тестович Радкевич');
  const [phone, setPhone] = useState<string>('+375 29 123-45-67');
  const [address, setAddress] = useState<string>('г. Минск, пр-т Победителей, 10, кв. 42');
  const [role, setRole] = useState<'customer' | 'operator'>('customer');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleQuickLogin = (demoRole: 'customer' | 'operator') => {
    setErrorMsg(null);
    if (demoRole === 'customer') {
      setEmail('customer@test.by');
      setPassword('Customer123!');
      setRole('customer');
    } else {
      setEmail('operator@test.by');
      setPassword('Operator123!');
      setRole('operator');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      if (mode === 'login') {
        const user = await loginUser(email, password);
        onAuthSuccess(user);
        onClose();
      } else {
        const user = await registerUser({
          email,
          password,
          name,
          phone,
          address,
          role
        });
        onAuthSuccess(user);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Ошибка авторизации');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnonymous = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const guest = await loginAnonymous();
      onAuthSuccess(guest);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Ошибка гостевого входа');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#364C49]/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-md bg-white rounded-[32px] overflow-hidden shadow-2xl border border-[#EDE1D5] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#F6EFE6] px-5 py-4 border-b border-[#EDE1D5] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#DD5757] text-white flex items-center justify-center shadow-xs">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#364C49]">
                {mode === 'login' ? 'Вход в picPac' : 'Регистрация профиля'}
              </h2>
              <p className="text-[11px] text-[#7A8C88]">
                Единая база данных клиентов и операторов цеха
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-[#7A8C88] hover:bg-white hover:text-[#364C49] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto p-5 space-y-4">
          {/* Quick Demo Switcher for Hackathon Jury */}
          <div className="bg-[#F6EFE6] rounded-2xl p-3 border border-[#EDE1D5] space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#364C49]">
              <span className="flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5 text-[#DD5757]" />
                <span>Быстрый вход для проверки жюри:</span>
              </span>
              <span className="text-[10px] text-[#7A8C88] bg-white px-2 py-0.5 rounded-full border border-[#EDE1D5]">
                SQLite DB
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  handleQuickLogin('customer');
                }}
                className="p-2.5 rounded-xl bg-white border border-[#EDE1D5] hover:border-[#364C49] text-left cursor-pointer transition-all shadow-xs"
              >
                <div className="flex items-center space-x-1.5 font-bold text-[#364C49]">
                  <User className="w-3.5 h-3.5 text-[#DD5757]" />
                  <span>Клиент</span>
                </div>
                <span className="text-[10px] text-[#7A8C88] block mt-0.5 leading-tight">
                  Иван Радкевич • Заказы и доставка
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  handleQuickLogin('operator');
                }}
                className="p-2.5 rounded-xl bg-white border border-[#EDE1D5] hover:border-[#364C49] text-left cursor-pointer transition-all shadow-xs"
              >
                <div className="flex items-center space-x-1.5 font-bold text-[#364C49]">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#7AA45A]" />
                  <span>Оператор</span>
                </div>
                <span className="text-[10px] text-[#7A8C88] block mt-0.5 leading-tight">
                  Анна • Лаборатория в Великом камне
                </span>
              </button>
            </div>
          </div>

          {/* Mode Tabs */}
          <div className="flex bg-[#F6EFE6] p-1 rounded-2xl border border-[#EDE1D5]">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg(null);
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-[#364C49] shadow-xs'
                  : 'text-[#7A8C88] hover:text-[#364C49]'
              }`}
            >
              Вход по паролю
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMsg(null);
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                mode === 'register'
                  ? 'bg-white text-[#364C49] shadow-xs'
                  : 'text-[#7A8C88] hover:text-[#364C49]'
              }`}
            >
              Регистрация в БД
            </button>
          </div>

          {/* Error Message Alert */}
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-2xl flex items-start space-x-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3 text-xs">
            {mode === 'register' && (
              <>
                <div>
                  <label className="text-[11px] font-bold text-[#364C49] block mb-1">
                    ФИО или Имя
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Например: Дарья Васильева"
                    className="w-full bg-[#F6EFE6]/50 border border-[#EDE1D5] rounded-xl px-3 py-2 text-xs text-[#364C49] font-medium focus:outline-none focus:border-[#DD5757]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-[#364C49] block mb-1">
                      Телефон РБ
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="+375 29 000-00-00"
                      className="w-full bg-[#F6EFE6]/50 border border-[#EDE1D5] rounded-xl px-3 py-2 text-xs text-[#364C49] font-medium focus:outline-none focus:border-[#DD5757]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-[#364C49] block mb-1">
                      Роль в системе
                    </label>
                    <select
                      value={role}
                      onChange={e => setRole(e.target.value as any)}
                      className="w-full bg-[#F6EFE6]/50 border border-[#EDE1D5] rounded-xl px-2 py-2 text-xs text-[#364C49] font-bold focus:outline-none focus:border-[#DD5757]"
                    >
                      <option value="customer">Покупатель (Клиент)</option>
                      <option value="operator">Оператор лаборатории</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="text-[11px] font-bold text-[#364C49] block mb-1">
                Email адрес
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-[#F6EFE6]/50 border border-[#EDE1D5] rounded-xl pl-8 pr-3 py-2 text-xs text-[#364C49] font-medium focus:outline-none focus:border-[#DD5757]"
                />
                <Mail className="w-4 h-4 text-[#7A8C88] absolute left-2.5 top-2.5" />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#364C49] block mb-1">
                Пароль
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Минимум 6 символов"
                  className="w-full bg-[#F6EFE6]/50 border border-[#EDE1D5] rounded-xl pl-8 pr-9 py-2 text-xs text-[#364C49] font-medium focus:outline-none focus:border-[#DD5757]"
                />
                <Lock className="w-4 h-4 text-[#7A8C88] absolute left-2.5 top-2.5" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-2.5 text-[#7A8C88] hover:text-[#364C49]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-full bg-[#DD5757] hover:bg-[#c94b4b] text-white font-extrabold text-xs flex items-center justify-center space-x-2 shadow-sm shadow-[#DD5757]/20 cursor-pointer disabled:opacity-60 transition-all"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Связь с базой данных...</span>
                </>
              ) : (
                <>
                  <span>{mode === 'login' ? 'Войти в аккаунт' : 'Зарегистрироваться'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Anonymous Guest Option */}
          <div className="pt-2 border-t border-[#EDE1D5] text-center space-y-2">
            <p className="text-[11px] text-[#7A8C88]">
              Не хотите регистрироваться сейчас?
            </p>
            <button
              type="button"
              onClick={handleAnonymous}
              disabled={isLoading}
              className="w-full py-2.5 rounded-full bg-[#F6EFE6] hover:bg-[#EDE1D5] text-[#364C49] text-xs font-bold transition-all border border-[#EDE1D5] cursor-pointer"
            >
              Продолжить анонимно (Гостевой режим)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
