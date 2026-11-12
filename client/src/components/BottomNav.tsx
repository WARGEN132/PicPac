import React from 'react';
import { Home, Sparkles, BookOpen, Layers, User } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  isGuest: boolean;
  isOperator: boolean;
  onTabChange: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  isGuest,
  isOperator,
  onTabChange
}) => {
  const tabs = [
    { id: 'home', label: 'Главная', icon: Home },
    { id: 'ideas', label: 'Пикпаки', icon: Sparkles, badge: 'NEW' },
    { id: 'catalog', label: 'Каталог', icon: BookOpen },
    { id: 'projects', label: 'Макеты', icon: Layers },
    { id: 'profile', label: isOperator ? 'Оператор' : 'Профиль', icon: User }
  ].filter(tab => !isGuest || (tab.id !== 'projects' && tab.id !== 'profile'));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#EDE1D5] shadow-lg pb-safe">
      <div className={`max-w-md mx-auto grid h-16 ${isGuest ? 'grid-cols-3' : 'grid-cols-5'}`}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center space-y-1 relative transition-colors cursor-pointer select-none ${
                isActive ? 'text-[#DD5757]' : 'text-[#7A8C88] hover:text-[#364C49]'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
                {tab.badge && !isActive && (
                  <span className="absolute -top-1.5 -right-3 text-[9px] font-black bg-[#DD5757] text-white px-1 py-0.2 rounded-full leading-none">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[11px] font-semibold leading-none ${isActive ? 'font-black text-[#DD5757]' : ''}`}>
                {tab.label}
              </span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#DD5757] absolute bottom-1"></span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

