import React, { useState } from 'react';
import {
  Upload,
  RotateCw,
  Crop,
  Sparkles,
  RefreshCw,
  Check,
  ChevronRight,
  BookOpen,
  Camera,
  Layers,
  Image as ImageIcon
} from 'lucide-react';
import { generateBookAI } from '../services/api';
import { readPhoto } from '../services/photos';
import { PhotobookDocument, Product } from '../types';

interface HomePhotoCoverStudioProps {
  product?: Product;
  onBookReady: (doc: PhotobookDocument, productId: string, variantId: string) => void;
  onOpenPrints: () => void;
  onOpenCatalog: () => void;
}

const PRESET_PHOTOS = [
  {
    id: 'sea',
    label: 'Отпуск на море',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80'
  },
  {
    id: 'family',
    label: 'Семья и дети',
    url: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=800&auto=format&fit=crop&q=80'
  },
  {
    id: 'wedding',
    label: 'Свадебный день',
    url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&auto=format&fit=crop&q=80'
  },
  {
    id: 'mountains',
    label: 'Горы и природа',
    url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=80'
  }
];

const COVER_COLORS = [
  { id: 'linen', name: 'Тёплый лён', hex: '#E8E0D5', textColor: '#364C49' },
  { id: 'slate', name: 'Тёмный графит', hex: '#364C49', textColor: '#FFFFFF' },
  { id: 'coral', name: 'Терракота', hex: '#DD5757', textColor: '#FFFFFF' },
  { id: 'sage', name: 'Шалфей', hex: '#7C807F', textColor: '#FFFFFF' },
  { id: 'navy', name: 'Глубокий синий', hex: '#2A3B4C', textColor: '#FFFFFF' }
];

export const HomePhotoCoverStudio: React.FC<HomePhotoCoverStudioProps> = ({
  product,
  onBookReady,
  onOpenPrints,
  onOpenCatalog
}) => {
  // Photo states
  const [selectedPhoto, setSelectedPhoto] = useState<string>(PRESET_PHOTOS[0].url);
  const [rotation, setRotation] = useState<number>(0);
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '3:4' | '4:3'>('1:1');
  const [isAiEnhanced, setIsAiEnhanced] = useState<boolean>(false);

  // Cover states
  const [bookTitle, setBookTitle] = useState<string>('Наш счастливый отпуск');
  const [selectedColor, setSelectedColor] = useState(COVER_COLORS[0]);
  const [variantId, setVariantId] = useState('');
  const selectedVariant = product?.variants.find(variant => variant.id === variantId) ?? product?.variants[0];

  // Generation status
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleToggleAspect = () => {
    if (aspectRatio === '1:1') setAspectRatio('3:4');
    else if (aspectRatio === '3:4') setAspectRatio('4:3');
    else setAspectRatio('1:1');
  };

  const handleToggleEnhance = () => {
    setIsAiEnhanced(prev => !prev);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setSelectedPhoto(await readPhoto(file));
      setRotation(0);
    } catch (error) {
      alert((error as Error).message);
    }
  };

  const handleGenerateBook = async () => {
    if (!product || !selectedVariant) return;
    try {
      setIsGenerating(true);
      // Generate using real server endpoint
      const photosList = [
        selectedPhoto,
        PRESET_PHOTOS[1].url,
        PRESET_PHOTOS[2].url,
        PRESET_PHOTOS[3].url,
        'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800&auto=format&fit=crop&q=80'
      ];

      const doc = await generateBookAI({
        photos: photosList,
        theme: 'Отпуск и путешествия',
        style: 'modern',
        format: selectedVariant.attributes.size ?? selectedVariant.name,
        coverType: selectedVariant.attributes.cover,
        pages: selectedVariant.attributes.pages,
        title: bookTitle
      });

      // Update cover photo and color in document
      doc.cover.coverPhotoUrl = selectedPhoto;
      doc.cover.backgroundColor = selectedColor.hex;
      doc.title = bookTitle;

      onBookReady(doc, product.id, selectedVariant.id);
    } catch (err: any) {
      alert('Ошибка при создании фотокниги: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Top Banner / Hero Title */}
      <div>
        <h1 className="text-xl font-black text-[#364C49] tracking-tight leading-snug">
          Создайте фотокнигу со смартфона
        </h1>
        <p className="text-xs text-[#7C807F] mt-1">
          Загрузите фотографию, настройте обложку — и ИИ моментально соберёт развороты
        </p>
      </div>

      {/* ========================================================= */}
      {/* 1. PHOTO UPLOAD & DIRECT TRANSFORMATION CONTAINER         */}
      {/* ========================================================= */}
      <div className="bg-white rounded-3xl p-4.5 border border-[#BCBFB7]/40 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-5 h-5 rounded-full bg-[#DD5757] text-white text-[11px] font-black flex items-center justify-center">
              1
            </span>
            <h2 className="font-extrabold text-sm text-[#364C49]">
              Фотография для обложки
            </h2>
          </div>
          <label className="text-xs font-bold text-[#DD5757] hover:underline cursor-pointer flex items-center space-x-1">
            <Upload className="w-3.5 h-3.5" />
            <span>Загрузить фото</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* Live Photo Preview Card with Transformation */}
        <div className="relative rounded-2xl overflow-hidden bg-[#F6EFE6] border border-[#BCBFB7]/40 flex items-center justify-center min-h-[220px]">
          <div
            className={`transition-all duration-300 w-full flex items-center justify-center ${
              aspectRatio === '1:1'
                ? 'aspect-square max-h-[230px]'
                : aspectRatio === '3:4'
                ? 'aspect-[3/4] max-h-[260px]'
                : 'aspect-[4/3] max-h-[200px]'
            }`}
          >
            <img
              src={selectedPhoto}
              alt="Выбранное фото"
              className={`w-full h-full object-cover transition-transform duration-300 ${
                isAiEnhanced ? 'contrast-110 brightness-105 saturate-110 filter' : ''
              }`}
              style={{ transform: `rotate(${rotation}deg)` }}
            />
          </div>

          {/* AI Enhanced Status Badge */}
          {isAiEnhanced && (
            <div className="absolute top-3 left-3 bg-[#364C49]/95 text-white backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold flex items-center space-x-1.5 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-[#DD5757]" />
              <span>Предпросмотр с фильтром</span>
            </div>
          )}
        </div>

        {/* Clean, High-Contrast Photo Transformation Bar */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          {/* Rotate */}
          <button
            type="button"
            onClick={handleRotate}
            className="flex items-center justify-center space-x-1.5 py-2 px-2 rounded-xl bg-[#F6EFE6] text-[#364C49] hover:bg-[#EAECE7] border border-[#BCBFB7]/50 font-bold transition-colors cursor-pointer"
            title="Повернуть фото на 90 градусов"
          >
            <RotateCw className="w-4 h-4 text-[#DD5757]" />
            <span>{rotation === 0 ? 'Повернуть' : `${rotation}°`}</span>
          </button>

          {/* Aspect Ratio */}
          <button
            type="button"
            onClick={handleToggleAspect}
            className="flex items-center justify-center space-x-1.5 py-2 px-2 rounded-xl bg-[#F6EFE6] text-[#364C49] hover:bg-[#EAECE7] border border-[#BCBFB7]/50 font-bold transition-colors cursor-pointer"
            title="Переключить пропорции кадрирования"
          >
            <Crop className="w-4 h-4 text-[#364C49]" />
            <span>{aspectRatio}</span>
          </button>

          {/* AI Enhance */}
          <button
            type="button"
            onClick={handleToggleEnhance}
            className={`flex items-center justify-center space-x-1.5 py-2 px-2 rounded-xl font-bold transition-all cursor-pointer ${
              isAiEnhanced
                ? 'bg-[#DD5757] text-white shadow-xs'
                : 'bg-[#F6EFE6] text-[#364C49] hover:bg-[#EAECE7] border border-[#BCBFB7]/50'
            }`}
            title="Автоматическая коррекция цвета и резкости"
          >
            <Sparkles className={`w-4 h-4 ${isAiEnhanced ? 'text-white' : 'text-[#DD5757]'}`} />
            <span>{isAiEnhanced ? 'Фильтр включён' : 'Фильтр'}</span>
          </button>
        </div>

        {/* Quick Presets Selection */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-[#7C807F] block">
            Или выберите готовый снимок для быстрой проверки:
          </span>
          <div className="grid grid-cols-4 gap-2">
            {PRESET_PHOTOS.map(preset => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setSelectedPhoto(preset.url);
                  setRotation(0);
                }}
                className={`relative rounded-xl overflow-hidden aspect-square border-2 transition-all cursor-pointer ${
                  selectedPhoto === preset.url
                    ? 'border-[#DD5757] ring-2 ring-[#DD5757]/30 scale-[1.02]'
                    : 'border-transparent opacity-80 hover:opacity-100'
                }`}
              >
                <img
                  src={preset.url}
                  alt={preset.label}
                  className="w-full h-full object-cover"
                />
                {selectedPhoto === preset.url && (
                  <div className="absolute inset-0 bg-[#DD5757]/20 flex items-center justify-center">
                    <div className="w-5 h-5 rounded-full bg-[#DD5757] text-white flex items-center justify-center">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. INSTANT COVER SELECTION CONTAINER                      */}
      {/* ========================================================= */}
      <div className="bg-white rounded-3xl p-4.5 border border-[#BCBFB7]/40 shadow-xs space-y-3.5">
        <div className="flex items-center space-x-2">
          <span className="w-5 h-5 rounded-full bg-[#364C49] text-white text-[11px] font-black flex items-center justify-center">
            2
          </span>
          <h2 className="font-extrabold text-sm text-[#364C49]">
            Подбор обложки и параметров
          </h2>
        </div>

        {/* Book Title Input */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-[#7C807F]">
            Название на обложке
          </label>
          <input
            type="text"
            value={bookTitle}
            onChange={(e) => setBookTitle(e.target.value)}
            placeholder="Например: Наш незабываемый отпуск"
            className="w-full bg-[#F6EFE6]/50 border border-[#BCBFB7]/60 rounded-xl px-3.5 py-2 text-xs font-bold text-[#364C49] focus:outline-none focus:border-[#DD5757]"
          />
        </div>

        {/* Cover Color Palette */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[11px]">
            <span className="font-bold text-[#7C807F]">Цвет переплёта:</span>
            <span className="font-extrabold text-[#364C49]">{selectedColor.name}</span>
          </div>
          <div className="flex items-center space-x-2.5">
            {COVER_COLORS.map(color => (
              <button
                key={color.id}
                type="button"
                onClick={() => setSelectedColor(color)}
                style={{ backgroundColor: color.hex }}
                className={`w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center cursor-pointer shadow-xs ${
                  selectedColor.id === color.id
                    ? 'border-[#364C49] ring-2 ring-[#364C49]/40 scale-110'
                    : 'border-white/80'
                }`}
                title={color.name}
              >
                {selectedColor.id === color.id && (
                  <Check
                    className="w-4 h-4 stroke-[3]"
                    style={{ color: color.textColor }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {product && (
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-[#7C807F]">Комплектация {product.name.split(' ')[0]}</span>
            <div className="grid gap-2">
              {product.variants.map(variant => (
                <button
                  key={variant.id}
                  type="button"
                  aria-pressed={selectedVariant?.id === variant.id}
                  onClick={() => setVariantId(variant.id)}
                  className={`rounded-xl border p-2.5 text-left text-xs flex items-center justify-between gap-2
                    ${selectedVariant?.id === variant.id ? 'bg-[#364C49] border-[#364C49] text-white' : 'bg-white border-[#BCBFB7]/60 text-[#364C49]'}`}
                >
                  <span>
                    <strong className="block">{variant.attributes.size} · {variant.attributes.pages} стр.</strong>
                    {variant.attributes.cover}
                  </span>
                  <strong className="shrink-0">{variant.totalPrice.toFixed(2)} BYN</strong>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* BIG CTA BUTTON */}
        <button
          type="button"
          onClick={handleGenerateBook}
          disabled={isGenerating || !selectedVariant}
          className="w-full py-4 rounded-2xl bg-[#DD5757] hover:bg-[#c94b4b] text-white font-black text-sm flex items-center justify-center space-x-2 shadow-lg shadow-[#DD5757]/25 cursor-pointer transition-all active:scale-[0.98] disabled:opacity-70"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>ИИ генерирует развороты книги...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Собрать фотокнигу с ИИ</span>
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {/* ========================================================= */}
      {/* 3. QUICK CATALOG SHORTCUTS FROM SITE                      */}
      {/* ========================================================= */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        {/* Photo Prints */}
        <div
          onClick={onOpenPrints}
          className="bg-white rounded-3xl p-3.5 border border-[#BCBFB7]/40 shadow-xs hover:border-[#364C49] transition-all cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-[#364C49] text-white flex items-center justify-center mb-2.5 shadow-xs">
            <Camera className="w-4 h-4" />
          </div>
          <h3 className="font-extrabold text-xs text-[#364C49] leading-tight">
            Печать фотографий
          </h3>
          <p className="text-[10px] text-[#7C807F] mt-0.5">
            Fujifilm от 0.65 BYN
          </p>
          <div className="mt-2.5 text-[10px] font-bold text-[#DD5757] flex items-center space-x-0.5 group-hover:translate-x-0.5 transition-transform">
            <span>Заказать</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </div>

        {/* Canvas & Magnets */}
        <div
          onClick={onOpenCatalog}
          className="bg-white rounded-3xl p-3.5 border border-[#BCBFB7]/40 shadow-xs hover:border-[#364C49] transition-all cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-[#DD5757] text-white flex items-center justify-center mb-2.5 shadow-xs">
            <Layers className="w-4 h-4" />
          </div>
          <h3 className="font-extrabold text-xs text-[#364C49] leading-tight">
            Холсты и сувениры
          </h3>
          <p className="text-[10px] text-[#7C807F] mt-0.5">
            Холсты от 35 BYN, магниты
          </p>
          <div className="mt-2.5 text-[10px] font-bold text-[#364C49] flex items-center space-x-0.5 group-hover:translate-x-0.5 transition-transform">
            <span>В каталог</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </div>
      </div>
    </div>
  );
};
