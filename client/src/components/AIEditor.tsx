import React, { useState } from 'react';
import { PhotobookDocument, BookSpread } from '../types';
import { sendAIEditCommand } from '../services/api';
import { PreFlightModal, scanDocumentIssues } from './PreFlightModal';
import {
  Sparkles,
  Send,
  Undo2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Sliders,
  CheckCircle,
  AlertTriangle,
  Layers,
  Save,
  ShoppingBag,
  MessageSquare,
  X,
  Type,
  Palette,
  Image as ImageIcon,
  RotateCcw,
  ShieldCheck,
  Wand2,
  ArrowRight
} from 'lucide-react';

interface AIEditorProps {
  document: PhotobookDocument;
  projectId?: string;
  onSave: (doc: PhotobookDocument) => Promise<void>;
  onAddToCart: (doc: PhotobookDocument) => void;
  onClose: () => void;
}

export const AIEditor: React.FC<AIEditorProps> = ({
  document: initialDoc,
  projectId,
  onSave,
  onAddToCart,
  onClose
}) => {
  const [doc, setDoc] = useState<PhotobookDocument>(initialDoc);
  const [history, setHistory] = useState<PhotobookDocument[]>([initialDoc]);
  const [historyIdx, setHistoryIdx] = useState<number>(0);
  const [currentSpreadIdx, setCurrentSpreadIdx] = useState<number>(0); // 0 = Cover, 1..N = Spreads
  const [showSafeZones, setShowSafeZones] = useState<boolean>(true);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [isPreFlightOpen, setIsPreFlightOpen] = useState<boolean>(false);
  const [smartLayoutToast, setSmartLayoutToast] = useState<string | null>(null);

  const [aiChatLogs, setAiChatLogs] = useState<{ sender: 'user' | 'ai'; text: string; time: string }[]>([
    {
      sender: 'ai',
      text: 'Здравствуйте! Я ваш AI-дизайнер PicPac. Я подготовил макет фотокниги по стандартам Layflat 180°. Вы можете написать мне любую правку (например: «Сделай фон тёплым» или «Добавь подпись»), либо нажать кнопку Smart Auto-Layout.',
      time: 'только что'
    }
  ]);
  const [activeTab, setActiveTab] = useState<'preview' | 'ai_chat' | 'manual'>('preview');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const totalViews = doc.spreads.length + 1; // Cover + Spreads
  const isCover = currentSpreadIdx === 0;
  const currentSpread: BookSpread | undefined = isCover ? undefined : doc.spreads[currentSpreadIdx - 1];

  const pushState = (newDoc: PhotobookDocument) => {
    const updatedHistory = history.slice(0, historyIdx + 1);
    updatedHistory.push(newDoc);
    setHistory(updatedHistory);
    setHistoryIdx(updatedHistory.length - 1);
    setDoc(newDoc);
  };

  const handleUndo = () => {
    if (historyIdx > 0) {
      const prevIdx = historyIdx - 1;
      setHistoryIdx(prevIdx);
      setDoc(history[prevIdx]);
    }
  };

  // KILLER FEATURE: Smart Auto-Layout in 1 second
  const handleSmartAutoLayout = () => {
    // Gather all unique photos in the document
    const allPhotos: string[] = [];
    if (doc.cover.coverPhotoUrl) allPhotos.push(doc.cover.coverPhotoUrl);
    doc.spreads.forEach(sp => {
      [...sp.leftPage.elements, ...sp.rightPage.elements].forEach(el => {
        if (el.photoUrl && !allPhotos.includes(el.photoUrl)) {
          allPhotos.push(el.photoUrl);
        }
      });
    });

    // If fewer than 10 photos, pad with high-res brand photos
    const fallbackPhotos = [
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800&auto=format&fit=crop&q=80'
    ];

    const pool = allPhotos.length >= 6 ? allPhotos : [...allPhotos, ...fallbackPhotos];

    // Build balanced, artistic spreads
    const newSpreads: BookSpread[] = [];
    const spreadCount = Math.max(4, Math.ceil(pool.length / 2));

    for (let i = 0; i < spreadCount; i++) {
      const p1 = pool[(i * 2) % pool.length];
      const p2 = pool[(i * 2 + 1) % pool.length];
      const p3 = pool[(i * 2 + 2) % pool.length];

      let leftElements: any[] = [];
      let rightElements: any[] = [];

      if (i % 3 === 0) {
        // Hero shot on left + portrait with caption on right
        leftElements = [
          {
            id: `hero-${i}`,
            type: 'photo',
            x: 6,
            y: 6,
            width: 88,
            height: 88,
            zIndex: 1,
            photoUrl: p1
          }
        ];
        rightElements = [
          {
            id: `right-${i}`,
            type: 'photo',
            x: 10,
            y: 10,
            width: 80,
            height: 64,
            zIndex: 1,
            photoUrl: p2
          },
          {
            id: `cap-${i}`,
            type: 'text',
            x: 10,
            y: 78,
            width: 80,
            height: 14,
            zIndex: 2,
            text: i === 0 ? 'Главные моменты нашей поездки' : 'Особенные дни, сохранённые навсегда',
            fontSize: 13,
            color: '#364C49',
            align: 'center'
          }
        ];
      } else if (i % 3 === 1) {
        // 2 balanced photos with generous airy margins
        leftElements = [
          {
            id: `l-${i}`,
            type: 'photo',
            x: 12,
            y: 12,
            width: 76,
            height: 76,
            zIndex: 1,
            photoUrl: p1
          }
        ];
        rightElements = [
          {
            id: `r-${i}`,
            type: 'photo',
            x: 12,
            y: 12,
            width: 76,
            height: 76,
            zIndex: 1,
            photoUrl: p2
          }
        ];
      } else {
        // 1 large + 2 stacked collage
        leftElements = [
          {
            id: `l-large-${i}`,
            type: 'photo',
            x: 8,
            y: 8,
            width: 84,
            height: 84,
            zIndex: 1,
            photoUrl: p1
          }
        ];
        rightElements = [
          {
            id: `r-top-${i}`,
            type: 'photo',
            x: 10,
            y: 8,
            width: 80,
            height: 40,
            zIndex: 1,
            photoUrl: p2
          },
          {
            id: `r-bot-${i}`,
            type: 'photo',
            x: 10,
            y: 52,
            width: 80,
            height: 40,
            zIndex: 1,
            photoUrl: p3
          }
        ];
      }

      newSpreads.push({
        id: `spread-auto-${i + 1}`,
        spreadIndex: i,
        title: `Разворот ${i + 1}`,
        leftPage: {
          id: `page-${i * 2 + 1}`,
          pageNumber: i * 2 + 1,
          backgroundColor: '#FFFFFF',
          elements: leftElements
        },
        rightPage: {
          id: `page-${i * 2 + 2}`,
          pageNumber: i * 2 + 2,
          backgroundColor: '#FFFFFF',
          elements: rightElements
        }
      });
    }

    const updatedDoc: PhotobookDocument = {
      ...doc,
      spreads: newSpreads
    };

    pushState(updatedDoc);
    setSmartLayoutToast('✨ Smart Auto-Layout разложил 10+ фото по страницам!');
    setTimeout(() => setSmartLayoutToast(null), 3000);
  };

  const handleSendAiCommand = async (cmdText?: string) => {
    const command = (cmdText || aiPrompt).trim();
    if (!command) return;

    setIsAiLoading(true);
    const newLogs = [...aiChatLogs, { sender: 'user' as const, text: command, time: 'сейчас' }];
    setAiChatLogs(newLogs);
    setAiPrompt('');

    try {
      const result = await sendAIEditCommand({
        document: doc,
        currentSpreadIndex: Math.max(0, currentSpreadIdx - 1),
        command
      });

      pushState(result.updatedDocument);
      setAiChatLogs(prev => [
        ...prev,
        {
          sender: 'ai',
          text: result.message,
          time: 'сейчас'
        }
      ]);
    } catch (err: any) {
      setAiChatLogs(prev => [
        ...prev,
        {
          sender: 'ai',
          text: 'Извините, не удалось применить команду: ' + err.message,
          time: 'сейчас'
        }
      ]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSaveProject = async () => {
    setIsSaving(true);
    try {
      await onSave(doc);
      setSaveSuccessMsg('Проект автоматически сохранен');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } catch (err: any) {
      alert('Ошибка сохранения: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Pre-Flight check trigger before adding to cart
  const handleCheckoutClick = () => {
    const issues = scanDocumentIssues(doc);
    if (issues.length > 0) {
      setIsPreFlightOpen(true);
    } else {
      onAddToCart(doc);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#F6EFE6] flex flex-col animate-fadeIn select-none">
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col bg-[#F6EFE6] shadow-2xl relative">
        
        {/* Top Navigation Bar */}
        <div className="bg-white px-4 py-3 border-b border-[#EDE1D5] flex items-center justify-between craft-shadow-sm">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-[#364C49] hover:bg-[#F6EFE6] transition-colors cursor-pointer"
              title="Закрыть редактор"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-sm font-extrabold text-[#364C49] truncate max-w-[170px] font-comfortaa leading-tight">
                {doc.title || 'Моя фотокнига'}
              </h2>
              <span className="text-[10px] text-[#7A8C88] block">
                {doc.format} • {doc.coverType}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            {/* Undo Button */}
            <button
              type="button"
              onClick={handleUndo}
              disabled={historyIdx === 0}
              className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                historyIdx > 0
                  ? 'bg-white text-[#364C49] border-[#EDE1D5] hover:bg-[#F6EFE6]'
                  : 'bg-transparent text-[#BCBFB7] border-transparent cursor-not-allowed'
              }`}
              title="Отменить действие"
            >
              <Undo2 className="w-4 h-4" />
            </button>

            {/* Pre-Flight Quality Check Button */}
            <button
              type="button"
              onClick={() => setIsPreFlightOpen(true)}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-full bg-white text-[#364C49] border border-[#EDE1D5] text-xs font-bold hover:bg-[#F6EFE6] transition-colors cursor-pointer"
              title="Pre-Flight проверка качества"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Контроль</span>
            </button>

            {/* Save Button */}
            <button
              type="button"
              onClick={handleSaveProject}
              disabled={isSaving}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-full bg-[#F6EFE6] text-[#364C49] font-bold text-xs border border-[#EDE1D5] hover:bg-[#EAECE7] cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? '...' : 'Сохранить'}</span>
            </button>
          </div>
        </div>

        {/* Save / Layout toast */}
        {(saveSuccessMsg || smartLayoutToast) && (
          <div className="bg-[#364C49] text-white text-xs px-4 py-2 text-center flex items-center justify-center space-x-1.5 animate-fadeIn">
            <Sparkles className="w-3.5 h-3.5 text-[#DD5757]" />
            <span>{saveSuccessMsg || smartLayoutToast}</span>
          </div>
        )}

        {/* Work Area / Canvas Container */}
        <div className="flex-1 bg-[#F6EFE6] p-3 overflow-y-auto flex flex-col justify-center">
          
          {/* SPREAD PREVIEW CANVAS — SEAMLESS LAYFLAT 180° */}
          <div className="w-full relative bg-white rounded-2xl craft-shadow border border-[#EDE1D5] overflow-hidden aspect-[16/10] flex layflat-spread">
            
            {/* CENTRAL LAYFLAT SPINE FOLD SHADOW (Slide 26-28) */}
            {!isCover && (
              <div className="layflat-spine-shadow" />
            )}

            {/* Safe Zone / Bleed Overlay Info */}
            {showSafeZones && (
              <div className="absolute inset-1.5 pointer-events-none z-30 border border-dashed border-[#DD5757]/40 rounded-sm">
                <span className="absolute top-1 left-1.5 text-[9px] font-bold text-[#DD5757]/90 bg-white/90 px-1.5 py-0.5 rounded shadow-2xs">
                  Безопасная зона печати (5 мм)
                </span>
              </div>
            )}

            {/* COVER VIEW */}
            {isCover ? (
              <div
                className="w-full h-full flex flex-col justify-between p-4 relative"
                style={{ backgroundColor: doc.cover.backgroundColor || '#F6EFE6' }}
              >
                <div className="text-center pt-2">
                  <span className="text-[10px] tracking-widest uppercase font-bold text-[#7A8C88] block">
                    PicPac Collection • Layflat 180°
                  </span>
                  <h1 className="text-lg font-black text-[#364C49] mt-0.5 font-comfortaa">
                    {doc.cover.title}
                  </h1>
                  {doc.cover.subtitle && (
                    <p className="text-xs text-[#7A8C88] mt-0.5">{doc.cover.subtitle}</p>
                  )}
                </div>

                <div className="flex-1 my-3 flex items-center justify-center overflow-hidden rounded-xl bg-white shadow-inner p-1 border border-[#EDE1D5]">
                  <img
                    src={doc.cover.coverPhotoUrl}
                    alt="Cover"
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] font-bold text-[#7A8C88] border-t border-[#EDE1D5] pt-1.5">
                  <span>Формат: {doc.format}</span>
                  <span>{doc.cover.material}</span>
                </div>
              </div>
            ) : (
              /* TWO PAGES SPREAD (Left & Right) with Layflat Central Shadow */
              currentSpread && (
                <div className="w-full h-full flex divide-x divide-[#EDE1D5] relative">
                  {/* Left Page */}
                  <div
                    className="w-1/2 h-full relative p-2 overflow-hidden flex flex-col justify-between"
                    style={{ backgroundColor: currentSpread.leftPage.backgroundColor }}
                  >
                    <div className="flex-1 relative w-full h-full">
                      {currentSpread.leftPage.elements.map(el => {
                        if (el.type === 'photo') {
                          return (
                            <div
                              key={el.id}
                              className="absolute rounded-lg overflow-hidden craft-shadow-sm border border-white"
                              style={{
                                left: `${el.x}%`,
                                top: `${el.y}%`,
                                width: `${el.width}%`,
                                height: `${el.height}%`,
                                zIndex: el.zIndex
                              }}
                            >
                              <img
                                src={el.photoUrl}
                                alt="Photo"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          );
                        }
                        if (el.type === 'text') {
                          return (
                            <div
                              key={el.id}
                              className="absolute font-comfortaa font-bold px-1"
                              style={{
                                left: `${el.x}%`,
                                top: `${el.y}%`,
                                width: `${el.width}%`,
                                height: `${el.height}%`,
                                color: el.color || '#364C49',
                                fontSize: `${el.fontSize || 12}px`,
                                textAlign: el.align || 'center',
                                zIndex: el.zIndex
                              }}
                            >
                              {el.text}
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                    <span className="text-[10px] text-[#7A8C88] font-bold text-left pl-1">
                      стр. {currentSpread.leftPage.pageNumber}
                    </span>
                  </div>

                  {/* Right Page */}
                  <div
                    className="w-1/2 h-full relative p-2 overflow-hidden flex flex-col justify-between"
                    style={{ backgroundColor: currentSpread.rightPage.backgroundColor }}
                  >
                    <div className="flex-1 relative w-full h-full">
                      {currentSpread.rightPage.elements.map(el => {
                        if (el.type === 'photo') {
                          return (
                            <div
                              key={el.id}
                              className="absolute rounded-lg overflow-hidden craft-shadow-sm border border-white"
                              style={{
                                left: `${el.x}%`,
                                top: `${el.y}%`,
                                width: `${el.width}%`,
                                height: `${el.height}%`,
                                zIndex: el.zIndex
                              }}
                            >
                              <img
                                src={el.photoUrl}
                                alt="Photo"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          );
                        }
                        if (el.type === 'text') {
                          return (
                            <div
                              key={el.id}
                              className="absolute font-comfortaa font-bold px-1"
                              style={{
                                left: `${el.x}%`,
                                top: `${el.y}%`,
                                width: `${el.width}%`,
                                height: `${el.height}%`,
                                color: el.color || '#364C49',
                                fontSize: `${el.fontSize || 12}px`,
                                textAlign: el.align || 'center',
                                zIndex: el.zIndex
                              }}
                            >
                              {el.text}
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                    <span className="text-[10px] text-[#7A8C88] font-bold text-right pr-1">
                      стр. {currentSpread.rightPage.pageNumber}
                    </span>
                  </div>
                </div>
              )
            )}
          </div>

          {/* SPREAD NAVIGATION CAROUSEL */}
          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              disabled={currentSpreadIdx === 0}
              onClick={() => setCurrentSpreadIdx(prev => Math.max(0, prev - 1))}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                currentSpreadIdx > 0
                  ? 'bg-white text-[#364C49] border-[#EDE1D5] hover:bg-[#F6EFE6]'
                  : 'bg-transparent text-[#BCBFB7] border-transparent cursor-not-allowed'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Spreads Thumbnails Selector */}
            <div className="flex space-x-1.5 overflow-x-auto no-scrollbar py-1 px-1 max-w-[260px]">
              <button
                type="button"
                onClick={() => setCurrentSpreadIdx(0)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  currentSpreadIdx === 0
                    ? 'bg-[#364C49] text-white shadow-xs'
                    : 'bg-white text-[#7A8C88] border border-[#EDE1D5]'
                }`}
              >
                Обложка
              </button>
              {doc.spreads.map((sp, idx) => (
                <button
                  key={sp.id}
                  type="button"
                  onClick={() => setCurrentSpreadIdx(idx + 1)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    currentSpreadIdx === idx + 1
                      ? 'bg-[#364C49] text-white shadow-xs'
                      : 'bg-white text-[#7A8C88] border border-[#EDE1D5]'
                  }`}
                >
                  Разворот {idx + 1}
                </button>
              ))}
            </div>

            <button
              type="button"
              disabled={currentSpreadIdx >= totalViews - 1}
              onClick={() => setCurrentSpreadIdx(prev => Math.min(totalViews - 1, prev + 1))}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                currentSpreadIdx < totalViews - 1
                  ? 'bg-white text-[#364C49] border-[#EDE1D5] hover:bg-[#F6EFE6]'
                  : 'bg-transparent text-[#BCBFB7] border-transparent cursor-not-allowed'
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* BOTTOM ACTION & SMART TOOLBAR */}
        <div className="bg-white border-t border-[#EDE1D5] p-3.5 space-y-3 craft-shadow">
          {/* Tool actions: Smart Auto-Layout + AI Chat Toggle */}
          <div className="flex items-center justify-between space-x-2">
            {/* Smart Auto-Layout Button (KILLER FEATURE) */}
            <button
              type="button"
              onClick={handleSmartAutoLayout}
              className="flex-1 py-2.5 px-3 rounded-full bg-[#F6EFE6] hover:bg-[#EDE1D5] text-[#364C49] font-bold text-xs flex items-center justify-center space-x-1.5 border border-[#EDE1D5] transition-colors cursor-pointer"
            >
              <Wand2 className="w-3.5 h-3.5 text-[#DD5757]" />
              <span>Smart Auto-Layout</span>
            </button>

            {/* AI Chat Drawer Button */}
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === 'ai_chat' ? 'preview' : 'ai_chat')}
              className={`py-2.5 px-3.5 rounded-full text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer ${
                activeTab === 'ai_chat'
                  ? 'bg-[#364C49] text-white'
                  : 'bg-white text-[#364C49] border border-[#EDE1D5] hover:bg-[#F6EFE6]'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#DD5757]" />
              <span>AI Чат</span>
            </button>
          </div>

          {/* AI Chat drawer if active */}
          {activeTab === 'ai_chat' && (
            <div className="bg-[#F6EFE6] p-3 rounded-2xl border border-[#EDE1D5] space-y-2 animate-fadeIn">
              <div className="max-h-28 overflow-y-auto space-y-1.5 text-xs pr-1">
                {aiChatLogs.map((log, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded-xl ${
                      log.sender === 'user'
                        ? 'bg-[#364C49] text-white ml-6 text-right'
                        : 'bg-white text-[#364C49] mr-6 border border-[#EDE1D5]'
                    }`}
                  >
                    <span className="block text-[11px] leading-tight">{log.text}</span>
                  </div>
                ))}
              </div>
              <div className="flex space-x-1.5">
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendAiCommand()}
                  placeholder="Например: Сделай фон теплым или добавь надпись..."
                  className="flex-1 bg-white border border-[#EDE1D5] rounded-full px-3 py-1.5 text-xs text-[#364C49] font-medium focus:outline-none focus:border-[#DD5757]"
                />
                <button
                  type="button"
                  onClick={() => handleSendAiCommand()}
                  disabled={isAiLoading || !aiPrompt.trim()}
                  className="p-2 rounded-full bg-[#DD5757] text-white disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Primary CTA: Add to cart with pre-flight guarantee */}
          <div className="flex items-center justify-between pt-1">
            <div>
              <span className="text-[11px] text-[#7A8C88] block">Итого за фотокнигу:</span>
              <span className="text-base font-black text-[#DD5757]">
                38.99 BYN
              </span>
            </div>

            <button
              type="button"
              onClick={handleCheckoutClick}
              className="py-3.5 px-6 rounded-full bg-[#DD5757] hover:bg-[#c94b4b] text-white font-black text-xs flex items-center space-x-1.5 shadow-md shadow-[#DD5757]/20 transition-all cursor-pointer active:scale-95"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>В корзину →</span>
            </button>
          </div>
        </div>

      </div>

      {/* PRE-FLIGHT VALIDATOR MODAL (KILLER FEATURE 3) */}
      {isPreFlightOpen && (
        <PreFlightModal
          document={doc}
          onProceedAnyway={() => {
            setIsPreFlightOpen(false);
            onAddToCart(doc);
          }}
          onFixIssues={() => setIsPreFlightOpen(false)}
          onClose={() => setIsPreFlightOpen(false)}
        />
      )}
    </div>
  );
};
