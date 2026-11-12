import { readPhoto } from '../services/photos';
import React, { useState } from 'react';
import { Product, PhotobookDocument } from '../types';
import { generateBookAI } from '../services/api';
import {
  Sparkles,
  Upload,
  CheckCircle2,
  X,
  ChevronRight,
  ChevronLeft,
  Image as ImageIcon,
  Heart,
  Compass,
  Smile,
  Gift,
  FileCheck,
  Check,
  ShieldCheck,
  Plus
} from 'lucide-react';

interface BookCreatorModalProps {
  products: Product[];
  selectedProduct?: Product;
  onClose: () => void;
  onBookGenerated: (doc: PhotobookDocument, productId: string, variantId: string) => void;
}

export const BookCreatorModal: React.FC<BookCreatorModalProps> = ({
  products,
  selectedProduct: initialProduct,
  onClose,
  onBookGenerated
}) => {
  const photobookProducts = products.filter(p => p.category.includes('photobook'));
  const [selectedProduct, setSelectedProduct] = useState<Product>(
    initialProduct || photobookProducts[0] || products[0]
  );
  const [step, setStep] = useState<number>(1); // 1 = params, 2 = photos, 3 = styling, 4 = generating

  const [variantId, setVariantId] = useState(selectedProduct.variants[0]?.id);
  const selectedVariant = selectedProduct.variants.find(variant => variant.id === variantId);

  // Step 2: Photos presets & uploads
  const samplePhotoPresets = [
    {
      id: 'family',
      label: 'Семейный уикенд (8 фото)',
      photos: [
        'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80'
      ]
    },
    {
      id: 'travel',
      label: 'Путешествие и горы (6 фото)',
      photos: [
        'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80'
      ]
    }
  ];

  const [selectedPhotos, setSelectedPhotos] = useState<string[]>(samplePhotoPresets[0].photos);
  const [photoValidationMsg, setPhotoValidationMsg] = useState<string>('Выбрана тестовая галерея');

  // Step 3: Theme & Style
  const themes = [
    { id: 'Семья', icon: Heart, desc: 'Тёплые семейные моменты' },
    { id: 'Путешествие', icon: Compass, desc: 'Отпуск и приключения' },
    { id: 'Детство', icon: Smile, desc: 'Первые улыбки и праздники' },
    { id: 'Свадьба', icon: Gift, desc: 'Самый важный день' }
  ];
  const [selectedTheme, setSelectedTheme] = useState<string>('Семья');
  const [selectedStyle, setSelectedStyle] = useState<string>('Минималистичный дизайн');
  const [bookTitle, setBookTitle] = useState<string>('Наша семейная история');
  const [customPrompt, setCustomPrompt] = useState<string>('Сделай акцент на семейных фотографиях, добавь воздух между снимками');

  // Step 4: Generation Progress
  const [genStepIdx, setGenStepIdx] = useState<number>(0);
  const genSteps = [
    'Анализ резкости и разрешения фотографий...',
    'Отбор лучших снимков и группировка по хронологии...',
    'Создание структуры фотокниги (Layflat 180°)...',
    'Формирование дизайна разворотов и композиций...',
    'Генерация обложки с тиснением...',
    'Техническая проверка макета на вылеты под обрез...'
  ];

  const handleStartGeneration = async () => {
    if (!selectedVariant) return;
    setStep(4);
    setGenStepIdx(0);

    // Realistic progress animation
    const interval = setInterval(() => {
      setGenStepIdx(prev => {
        if (prev < genSteps.length - 1) return prev + 1;
        return prev;
      });
    }, 450);

    try {
      const generatedDoc = await generateBookAI({
        photos: selectedPhotos,
        theme: selectedTheme,
        style: selectedStyle,
        format: selectedVariant.attributes.size ?? selectedVariant.name,
        coverType: selectedVariant.attributes.cover,
        pages: selectedVariant.attributes.pages,
        title: bookTitle,
        customPrompt
      });

      setTimeout(() => {
        clearInterval(interval);
        onBookGenerated(generatedDoc, selectedProduct.id, selectedVariant.id);
      }, 2600);
    } catch (err: any) {
      clearInterval(interval);
      alert('Ошибка при создании фотокниги: ' + err.message);
      setStep(3);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!files.length) return;
    try {
      const photos = await Promise.all(files.map(readPhoto));
      setSelectedPhotos(photos);
      setPhotoValidationMsg(`Выбрано фото: ${photos.length}`);
    } catch (error) {
      setPhotoValidationMsg((error as Error).message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#364C49]/40 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-md h-full sm:h-[90vh] bg-white sm:rounded-3xl flex flex-col shadow-2xl overflow-hidden border border-[#BCBFB7]/40">
        
        {/* Modal Header */}
        <div className="bg-white border-b border-[#BCBFB7]/40 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-[#DD5757] flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#364C49] leading-tight">
                Создание фотокниги с ИИ
              </h2>
              <p className="text-[11px] text-[#7C807F]">
                {step === 4 ? 'Создание макета' : `Шаг ${step} из 3 • ${['Параметры', 'Загрузка фото', 'Стиль и тема'][step - 1]}`}
              </p>
            </div>
          </div>
          {step < 4 && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#7C807F] hover:bg-[#F6EFE6] hover:text-[#364C49] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F6EFE6]/30">

          {/* STEP 1: PARAMETERS */}
          {step === 1 && (
            <div className="space-y-4 animate-fadeIn">
              {/* Product selector */}
              <div>
                <label className="text-xs font-bold text-[#364C49] uppercase tracking-wider block mb-1.5">
                  Выберите линейку фотокниги:
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {photobookProducts.map(p => {
                    const isSelected = selectedProduct.id === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedProduct(p);
                          setVariantId(p.variants[0]?.id);
                        }}
                        className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-white border-[#DD5757] shadow-sm'
                            : 'bg-white/80 border-[#BCBFB7]/60 hover:border-[#364C49]'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            className="w-12 h-12 object-cover rounded-xl"
                          />
                          <div>
                            <div className="flex items-center space-x-1.5">
                              <span className="font-bold text-sm text-[#364C49]">{p.name}</span>
                              {p.badge && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#F6EFE6] text-[#DD5757]">
                                  {p.badge}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-[#7C807F] block">
                              от {p.basePrice.toFixed(2)} BYN • {p.productionDays} дня
                            </span>
                          </div>
                        </div>
                        {isSelected && <Check className="w-5 h-5 text-[#DD5757]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-[#364C49] uppercase tracking-wider block mb-1.5">
                  Комплектация
                </span>
                <div className="grid gap-2">
                  {selectedProduct.variants.map(variant => (
                    <button
                      key={variant.id}
                      type="button"
                      aria-pressed={variant.id === variantId}
                      onClick={() => setVariantId(variant.id)}
                      className={`p-3 rounded-xl border text-left text-xs flex items-center justify-between gap-3
                        ${variant.id === variantId ? 'bg-[#364C49] border-[#364C49] text-white' : 'bg-white border-[#BCBFB7]/60 text-[#364C49]'}`}
                    >
                      <span>
                        <strong className="block">{variant.name}</strong>
                        {variant.attributes.cover}
                      </span>
                      <strong className="shrink-0">{variant.totalPrice.toFixed(2)} BYN</strong>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PHOTOS */}
          {step === 2 && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <span className="text-xs font-bold text-[#364C49] uppercase tracking-wider block mb-1">
                  Загрузите ваши фотографии:
                </span>
                <p className="text-xs text-[#7C807F]">
                  Выберите снимки из галереи смартфона или используйте готовый набор для быстрого демо.
                </p>
              </div>

              {/* Upload area */}
              <label className="border-2 border-dashed border-[#BCBFB7] hover:border-[#DD5757] rounded-2xl p-4 flex flex-col items-center justify-center space-y-2 cursor-pointer bg-white transition-colors">
                <div className="w-10 h-10 rounded-full bg-[#F6EFE6] flex items-center justify-center text-[#DD5757]">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="text-center">
                  <span className="text-xs font-bold text-[#364C49] block">
                    Выбрать фото со смартфона
                  </span>
                  <span className="text-[11px] text-[#7C807F]">
                    JPEG / PNG до 25 МБ (рекомендуется от 10 фото)
                  </span>
                </div>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {/* Demo Presets Bar */}
              <div>
                <span className="text-[11px] font-bold text-[#7C807F] uppercase tracking-wider block mb-1.5">
                  Или выберите тестовую галерею:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {samplePhotoPresets.map(preset => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setSelectedPhotos(preset.photos);
                        setPhotoValidationMsg(`Выбрано фото: ${preset.photos.length}`);
                      }}
                      className="p-2.5 rounded-xl border bg-white border-[#BCBFB7]/60 hover:border-[#364C49] text-left text-xs font-semibold text-[#364C49] flex items-center justify-between"
                    >
                      <span className="truncate">{preset.label}</span>
                      <Check className="w-3.5 h-3.5 text-[#DD5757]" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Photos Grid Preview */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-[#364C49]">
                    Выбрано снимков: {selectedPhotos.length}
                  </span>
                  <span className="text-[11px] text-[#7C807F]">Мин. 8 снимков</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {selectedPhotos.map((url, idx) => (
                    <div
                      key={idx}
                      className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 border border-[#BCBFB7]/50 shadow-xs"
                    >
                      <img src={url} alt={`photo-${idx}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setSelectedPhotos(selectedPhotos.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-[10px] flex items-center justify-center hover:bg-red-600 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quality validation badge */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center space-x-2 text-xs text-emerald-800">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{photoValidationMsg}</span>
              </div>
            </div>
          )}

          {/* STEP 3: THEME & STYLING */}
          {step === 3 && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <label className="text-xs font-bold text-[#364C49] uppercase tracking-wider block mb-1">
                  Название фотокниги:
                </label>
                <input
                  type="text"
                  value={bookTitle}
                  onChange={e => setBookTitle(e.target.value)}
                  placeholder="Например: Наша семейная история 2026"
                  className="w-full bg-white border border-[#BCBFB7]/70 rounded-xl px-3 py-2 text-xs text-[#364C49] font-bold focus:outline-none focus:border-[#DD5757]"
                />
              </div>

              {/* Theme selector */}
              <div>
                <label className="text-xs font-bold text-[#364C49] uppercase tracking-wider block mb-1.5">
                  Тематика альбома:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {themes.map(t => {
                    const Icon = t.icon;
                    const isSelected = selectedTheme === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedTheme(t.id)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-white border-[#DD5757] shadow-sm'
                            : 'bg-white/80 border-[#BCBFB7]/60 hover:border-[#364C49]'
                        }`}
                      >
                        <Icon className={`w-5 h-5 mb-1 ${isSelected ? 'text-[#DD5757]' : 'text-[#7C807F]'}`} />
                        <span className="font-bold text-xs text-[#364C49] block">{t.id}</span>
                        <span className="text-[10px] text-[#7C807F] block">{t.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Style selector */}
              <div>
                <label className="text-xs font-bold text-[#364C49] uppercase tracking-wider block mb-1.5">
                  Стиль оформления:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    'Минималистичный дизайн',
                    'Больше фото на странице',
                    'Тёплые пастельные тона',
                    'С акцентом на эмоции'
                  ].map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setSelectedStyle(st)}
                      className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
                        selectedStyle === st
                          ? 'bg-[#364C49] text-white border-[#364C49] shadow-xs'
                          : 'bg-white text-[#364C49] border-[#BCBFB7]/60 hover:bg-[#F6EFE6]'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Prompt */}
              <div>
                <label className="text-xs font-bold text-[#364C49] uppercase tracking-wider block mb-1">
                  Пожелания к ИИ (опционально):
                </label>
                <textarea
                  rows={2}
                  value={customPrompt}
                  onChange={e => setCustomPrompt(e.target.value)}
                  placeholder="Например: Сделай обложку светлой, на разворотах оставь больше свободного места..."
                  className="w-full bg-white border border-[#BCBFB7]/70 rounded-xl p-2.5 text-xs text-[#364C49] focus:outline-none focus:border-[#DD5757]"
                />
              </div>
            </div>
          )}

          {/* STEP 4: GENERATING ANIMATION */}
          {step === 4 && (
            <div className="py-8 px-4 flex flex-col items-center justify-center text-center space-y-5 animate-fadeIn">
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-4 border-[#DD5757]/20 border-t-[#DD5757] animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center text-[#DD5757]">
                  <Sparkles className="w-8 h-8 animate-pulse" />
                </div>
              </div>

              <div>
                <h3 className="text-base font-extrabold text-[#364C49]">
                  ИИ создаёт вашу фотокнигу PicPac
                </h3>
                <p className="text-xs text-[#7C807F] mt-1 max-w-xs mx-auto">
                  Формируем гармоничные развороты, подбираем обложку и настраиваем вылеты под печать
                </p>
              </div>

              {/* Progress Steps List (Section 8 Этап 4) */}
              <div className="w-full bg-white rounded-2xl p-4 border border-[#BCBFB7]/50 shadow-xs space-y-2 text-left">
                {genSteps.map((s, idx) => {
                  const isDone = idx < genStepIdx;
                  const isCurrent = idx === genStepIdx;
                  return (
                    <div key={idx} className="flex items-center space-x-2.5 text-xs">
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : isCurrent ? (
                        <div className="w-4 h-4 rounded-full border-2 border-[#DD5757] border-t-transparent animate-spin shrink-0"></div>
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-[#BCBFB7] shrink-0"></div>
                      )}
                      <span
                        className={`${
                          isDone
                            ? 'text-emerald-800 line-through opacity-70'
                            : isCurrent
                            ? 'font-bold text-[#364C49]'
                            : 'text-[#7C807F]'
                        }`}
                      >
                        {s}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        {step < 4 && (
          <div className="bg-white border-t border-[#BCBFB7]/40 p-3 flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="px-4 py-2.5 rounded-xl border border-[#BCBFB7]/60 text-xs font-bold text-[#364C49] hover:bg-[#F6EFE6] cursor-pointer flex items-center space-x-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Назад</span>
              </button>
            ) : (
              <div>
                <span className="text-[11px] text-[#7C807F] block">Стоимость</span>
                <span className="text-sm font-extrabold text-[#364C49]">
                  {(selectedVariant?.totalPrice ?? selectedProduct.basePrice).toFixed(2)} BYN
                </span>
              </div>
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                disabled={!selectedVariant || (step === 2 && selectedPhotos.length === 0)}
                className="px-5 py-2.5 rounded-xl bg-[#364C49] hover:bg-[#283836] text-white text-xs font-bold flex items-center space-x-1 cursor-pointer"
              >
                <span>Далее</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartGeneration}
                className="px-6 py-2.5 rounded-xl bg-[#DD5757] hover:bg-[#c94b4b] text-white text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-[#DD5757]/20 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Создать фотокнигу</span>
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
