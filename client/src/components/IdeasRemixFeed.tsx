import React from 'react';
import { Sparkles, Heart, ArrowRight, Layers, Camera } from 'lucide-react';
import { PhotobookDocument } from '../types';

interface IdeaItem {
  id: string;
  title: string;
  subtitle: string;
  categoryTag: string;
  tagColor: string;
  tagTextColor: string;
  coverImage: string;
  spreadPreview: string;
  format: string;
  coverMaterial: string;
  coverColor: string;
  photosCount: number;
  likes: number;
  photos: string[];
}

interface IdeasRemixFeedProps {
  onRemix: (idea: IdeaItem) => void;
  onOpenStudio: () => void;
}

export const IDEAS_LIST: IdeaItem[] = [
  {
    id: 'idea-braslav',
    title: 'Лето на Браславских озёрах',
    subtitle: 'Живая природа Беларуси, закаты над водой и походы с друзьями',
    categoryTag: 'Путешествия',
    tagColor: '#7AA45A', // олива brandbook
    tagTextColor: '#FFFFFF',
    coverImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
    spreadPreview: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=80',
    format: '20×20 см',
    coverMaterial: 'Тканевый лён',
    coverColor: '#E8E0D5',
    photosCount: 12,
    likes: 342,
    photos: [
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1510312305653-8ed496efae75?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&auto=format&fit=crop&q=80'
    ]
  },
  {
    id: 'idea-baby-year',
    title: 'Первый годик малыша',
    subtitle: 'Нежная лавандовая палитра, первые шаги и искренние улыбки',
    categoryTag: 'Семья и дети',
    tagColor: '#CEBCE2', // лаванда brandbook
    tagTextColor: '#364C49',
    coverImage: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=800&auto=format&fit=crop&q=80',
    spreadPreview: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=800&auto=format&fit=crop&q=80',
    format: '20×20 см',
    coverMaterial: 'Твёрдая Soft-Touch',
    coverColor: '#F4EFF7',
    photosCount: 14,
    likes: 518,
    photos: [
      'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1485546246426-74dc88dec4d9?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1471286174890-9c112ffca56a?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1516726817505-f5ed825624d8?w=800&auto=format&fit=crop&q=80'
    ]
  },
  {
    id: 'idea-wedding',
    title: 'Свадьба в Несвижском замке',
    subtitle: 'Бесшовный разворот Layflat 180°, золотое тиснение и бумага Fuji Silk',
    categoryTag: 'Свадьба',
    tagColor: '#DD5757', // коралл brandbook
    tagTextColor: '#FFFFFF',
    coverImage: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&auto=format&fit=crop&q=80',
    spreadPreview: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800&auto=format&fit=crop&q=80',
    format: '21×30 см',
    coverMaterial: 'Премиум экокожа',
    coverColor: '#364C49',
    photosCount: 16,
    likes: 894,
    photos: [
      'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1544078751-58fee2d8a03b?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1532712938310-34cb3982ef74?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=800&auto=format&fit=crop&q=80'
    ]
  },
  {
    id: 'idea-pets',
    title: 'Наши пушистые питомцы',
    subtitle: 'Уютный крафтовый стиль с забавными моментами и искренней радостью',
    categoryTag: 'Питомцы',
    tagColor: '#EDE1D5', // песочный крафт
    tagTextColor: '#364C49',
    coverImage: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800&auto=format&fit=crop&q=80',
    spreadPreview: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=800&auto=format&fit=crop&q=80',
    format: '20×20 см',
    coverMaterial: 'Тканевый лён',
    coverColor: '#FAF6F0',
    photosCount: 10,
    likes: 421,
    photos: [
      'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1561037404-61cd46aa615b?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1535930891776-0c2dfb7fda1a?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&auto=format&fit=crop&q=80'
    ]
  }
];

export const IdeasRemixFeed: React.FC<IdeasRemixFeedProps> = ({ onRemix, onOpenStudio }) => {
  return (
    <div className="space-y-4 animate-fadeIn pb-6">
      {/* Feed Hero Header */}
      <div className="bg-white rounded-3xl p-5 border border-[#EDE1D5] craft-shadow space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-[#DD5757] uppercase tracking-wider bg-[#F6EFE6] px-3 py-1 rounded-full border border-[#EDE1D5]">
            Пикпаки • Коллекции
          </span>
          <div className="flex items-center space-x-1 text-xs text-[#7A8C88]">
            <Sparkles className="w-4 h-4 text-[#DD5757]" />
            <span>Готовые макеты в 1 клик</span>
          </div>
        </div>
        <h1 className="text-xl font-black text-[#364C49] tracking-tight leading-snug font-comfortaa">
          Пикпаки: вдохновляйтесь и создавайте
        </h1>
        <p className="text-xs text-[#7A8C88] leading-relaxed">
          Выберите готовый пикпак и нажмите <strong>«Remix»</strong> — макет, цвета и композиция мгновенно перенесутся в ваш редактор.
        </p>
      </div>

      {/* Masonry Feed Cards */}
      <div className="space-y-4">
        {IDEAS_LIST.map((idea) => (
          <article
            key={idea.id}
            className="bg-white rounded-3xl overflow-hidden border border-[#EDE1D5] craft-shadow hover:shadow-lg transition-all group"
          >
            {/* Visual Cover Preview with Seamless Layflat Spread Peek */}
            <div className="relative h-56 overflow-hidden bg-[#F6EFE6]">
              <img
                src={idea.coverImage}
                alt={idea.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />

              {/* Tag Pill with Brand Color */}
              <div
                className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold shadow-sm"
                style={{ backgroundColor: idea.tagColor, color: idea.tagTextColor }}
              >
                {idea.categoryTag}
              </div>

              {/* Likes counter badge */}
              <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-bold text-[#364C49] flex items-center space-x-1 shadow-xs">
                <Heart className="w-3.5 h-3.5 text-[#DD5757] fill-[#DD5757]" />
                <span>{idea.likes}</span>
              </div>

              {/* Book Specs Capsule */}
              <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-xl text-xs font-medium flex items-center space-x-2">
                <span>{idea.format}</span>
                <span>•</span>
                <span>{idea.coverMaterial}</span>
                <span>•</span>
                <span>{idea.photosCount} фото</span>
              </div>
            </div>

            {/* Description & Action */}
            <div className="p-4.5 space-y-3">
              <div>
                <h3 className="text-base font-extrabold text-[#364C49] font-comfortaa leading-snug">
                  {idea.title}
                </h3>
                <p className="text-xs text-[#7A8C88] mt-1 leading-relaxed">
                  {idea.subtitle}
                </p>
              </div>

              {/* Mini preview of 4 photos from the album */}
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                {idea.photos.slice(1, 5).map((imgUrl, i) => (
                  <div key={i} className="aspect-square rounded-xl overflow-hidden bg-[#F6EFE6] border border-[#EDE1D5]/60">
                    <img src={imgUrl} alt="миниатюра" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>

              {/* KILLER FEATURE BUTTON: REMIX */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => onRemix(idea)}
                  className="w-full py-3.5 px-5 rounded-full bg-[#DD5757] hover:bg-[#c94b4b] text-white font-black text-sm flex items-center justify-center space-x-2 shadow-md shadow-[#DD5757]/25 transition-all cursor-pointer active:scale-[0.98]"
                >
                  <Sparkles className="w-4 h-4 text-white" />
                  <span>Хочу такой же (Remix)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};
