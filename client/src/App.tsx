import React, { useState, useEffect, useRef } from 'react';
import { AuthModal } from './components/AuthModal';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { BookCreatorModal } from './components/BookCreatorModal';
import { PrintsOrderModal } from './components/PrintsOrderModal';
import { AIEditor } from './components/AIEditor';
import { CheckoutModal } from './components/CheckoutModal';
import { OperatorPanel } from './components/OperatorPanel';
import { DeliveryTracker } from './components/DeliveryTracker';
import { HomePhotoCoverStudio } from './components/HomePhotoCoverStudio';
import {
  fetchProducts,
  fetchProjects,
  fetchOrders,
  updateProject,
  deleteProject,
  duplicateProject,
  createTicket,
  createProject,
  quoteOrder,
  fetchSession,
  logoutUser
} from './services/api';
import { Product, Project, CartItem, Order, PhotobookDocument, OrderQuote, AuthUser } from './types';
import { IdeasRemixFeed } from './components/IdeasRemixFeed';
import {
  Sparkles,
  Camera,
  Layers,
  ShoppingBag,
  ChevronRight,
  ChevronLeft,
  Trash2,
  Copy,
  Plus,
  MessageSquare,
  Wifi,
  BatteryCharging,
  Signal,
  CheckCircle2,
  X,
  Send,
  ArrowLeft
} from 'lucide-react';

export default function ClientApp() {
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);
  const [showAuth, setShowAuth] = useState(false);
  const [retry, setRetry] = useState(0);
  const [sessionError, setSessionError] = useState(false);
  const signingOut = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    fetchSession(controller.signal)
      .then(setUser)
      .catch(() => {
        if (!controller.signal.aborted) setSessionError(true);
      });
    return () => controller.abort();
  }, [retry]);

  const handleSignOut = async () => {
    if (signingOut.current) return;
    signingOut.current = true;
    try {
      await logoutUser();
      setShowAuth(false);
      setUser(null);
    } catch (error) {
      alert((error as Error).message);
    } finally {
      signingOut.current = false;
    }
  };

  if (user === undefined) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#F6EFE6] p-4 text-sm font-bold text-[#364C49]">
        {sessionError ? (
          <div className="space-y-3 text-center" role="alert">
            <p>Не удалось открыть PicPac.</p>
            <button type="button" onClick={() => { setSessionError(false); setRetry(value => value + 1); }}
              className="rounded-xl bg-[#364C49] px-4 py-2 text-white">Повторить</button>
          </div>
        ) : <p role="status">Открываем PicPac…</p>}
      </main>
    );
  }

  return (
    <>
      {user && <Shop user={user} onOpenAuth={() => setShowAuth(true)} onSignOut={handleSignOut} />}
      {(!user || showAuth) && (
        <AuthModal
          onClose={user ? () => setShowAuth(false) : undefined}
          onAuthSuccess={account => { setUser(account); setShowAuth(false); }}
        />
      )}
    </>
  );
}

interface ShopProps {
  user: AuthUser;
  onOpenAuth: () => void;
  onSignOut: () => void;
}

function Shop({ user, onOpenAuth, onSignOut }: ShopProps) {
  const isOperator = user.role === 'operator';
  const isGuest = user.role === 'guest';
  const canOrder = user.role === 'customer';
  const [activeTab, setActiveTab] = useState(isOperator ? 'profile' : 'home');
  const [previousTab, setPreviousTab] = useState<string>('home');
  const [products, setProducts] = useState<Product[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const latestLoad = useRef(0);

  // Active Modals / Flows
  const [isBookCreatorOpen, setIsBookCreatorOpen] = useState<boolean>(false);
  const [printsProduct, setPrintsProduct] = useState<Product | null>(null);
  const [editingProject, setEditingProject] = useState<{ doc: PhotobookDocument; productId: string; variantId?: string; projectId?: string } | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [catalogCategory, setCatalogCategory] = useState<string>('all');
  const [selectedProductDetails, setSelectedProductDetails] = useState<Product | null>(null);

  // Support Ticket Modal
  const [supportModalOrder, setSupportModalOrder] = useState<Order | null>(null);
  const [ticketSubject, setTicketSubject] = useState<string>('Уточнение по срокам доставки');
  const [ticketMessage, setTicketMessage] = useState<string>('');
  const [ticketSuccess, setTicketSuccess] = useState<boolean>(false);

  // Promo code
  const [promoCodeInput, setPromoCodeInput] = useState<string>('START10');
  const [appliedPromo, setAppliedPromo] = useState('START10');
  const [pricedCart, setPricedCart] = useState<{
    items: CartItem[]; promo: string; quote?: OrderQuote; error?: string;
  } | null>(null);

  const loadAllData = async () => {
    const request = ++latestLoad.current;
    try {
      const [productsData, projectsData, ordersData] = await Promise.all([
        fetchProducts(),
        isGuest ? Promise.resolve([]) : fetchProjects(),
        canOrder ? fetchOrders() : Promise.resolve([])
      ]);
      if (request !== latestLoad.current) return;
      setProducts(productsData);
      setProjects(projectsData);
      setOrders(ordersData);
    } catch (err) {
      console.error('Data load error:', err);
    }
  };

  useEffect(() => {
    if (isOperator) setActiveTab('profile');
    void loadAllData();
    return () => { latestLoad.current++; };
  }, [user.id, user.role]);

  // Handle opening cart from top header
  const handleOpenCart = () => {
    if (!canOrder) return;
    if (activeTab !== 'cart') {
      setPreviousTab(activeTab);
      setActiveTab('cart');
    }
  };

  // Handle returning from cart
  const handleBackFromCart = () => {
    setActiveTab(previousTab || 'home');
  };

  const classicBook = products.find(product => product.id === 'prod-book-classic');
  const defaultPrints = products.find(product => product.category === 'prints' && product.variants.length > 0);
  const defaultBookVariant = classicBook?.variants.find(variant => variant.isDefault);

  const handleBookGenerated = (
    doc: PhotobookDocument,
    productId = classicBook?.id,
    variantId = defaultBookVariant?.id
  ) => {
    if (!productId) {
      alert('Каталог пока недоступен. Попробуйте ещё раз после загрузки.');
      return;
    }
    setIsBookCreatorOpen(false);
    setEditingProject({ doc, productId, variantId });
  };

  // Handle Remix from Ideas Feed (1-click generation from curated story)
  const handleRemix = (idea: any) => {
    const photos: string[] = idea.photos || [];
    const p0 = photos[0] || idea.coverImage;
    const p1 = photos[1] || p0;
    const p2 = photos[2] || p0;
    const p3 = photos[3] || p1;

    const doc: PhotobookDocument = {
      version: '1.0',
      title: idea.title,
      theme: idea.categoryTag,
      style: 'craft',
      format: idea.format || '20×20 см',
      coverType: idea.coverMaterial || 'Тканевый лён',
      cover: {
        title: idea.title,
        subtitle: idea.subtitle || 'Коллекция воспоминаний picPac',
        coverPhotoUrl: idea.coverImage,
        backgroundColor: '#364C49',
        material: idea.coverMaterial || 'Тканевый лён',
        fontFamily: 'Comfortaa'
      },
      spreads: [
        {
          id: `remix-spread-1-${Date.now()}`,
          spreadIndex: 0,
          title: 'Разворот 1 • Атмосфера',
          leftPage: {
            id: `rmx-p-1`,
            pageNumber: 1,
            backgroundColor: '#FFFFFF',
            elements: [
              {
                id: `rmx-el-1`,
                type: 'photo',
                x: 10,
                y: 10,
                width: 80,
                height: 80,
                zIndex: 1,
                photoUrl: p0,
                caption: 'Главный момент'
              }
            ]
          },
          rightPage: {
            id: `rmx-p-2`,
            pageNumber: 2,
            backgroundColor: '#FFFFFF',
            elements: [
              {
                id: `rmx-el-2`,
                type: 'photo',
                x: 10,
                y: 10,
                width: 80,
                height: 80,
                zIndex: 1,
                photoUrl: p1,
                caption: 'Красота момента'
              }
            ]
          }
        },
        {
          id: `remix-spread-2-${Date.now()}`,
          spreadIndex: 1,
          title: 'Разворот 2 • Панорама',
          leftPage: {
            id: `rmx-p-3`,
            pageNumber: 3,
            backgroundColor: '#FFFFFF',
            elements: [
              {
                id: `rmx-el-3`,
                type: 'photo',
                x: 8,
                y: 12,
                width: 84,
                height: 76,
                zIndex: 1,
                photoUrl: p2
              }
            ]
          },
          rightPage: {
            id: `rmx-p-4`,
            pageNumber: 4,
            backgroundColor: '#FFFFFF',
            elements: [
              {
                id: `rmx-el-4`,
                type: 'photo',
                x: 8,
                y: 12,
                width: 84,
                height: 76,
                zIndex: 1,
                photoUrl: p3
              }
            ]
          }
        }
      ],
      productionSettings: {
        widthMm: 200,
        heightMm: 200,
        safeZoneMm: 5,
        bleedMm: 3,
        spineMm: 8
      }
    };

    handleBookGenerated(doc);
  };

  const openPrints = (product: Product | undefined) => {
    if (canOrder && product) setPrintsProduct(product);
    else if (isGuest) onOpenAuth();
  };

  const handleAddBookToCart = (doc: PhotobookDocument, productId: string, variantId?: string) => {
    if (!canOrder) return;
    const product = products.find(item => item.id === productId);
    if (!product) {
      alert('Эта фотокнига сейчас недоступна в каталоге.');
      return;
    }
    const variant = product.variants.find(item => item.id === variantId);
    const price = variant?.totalPrice ?? product.basePrice;
    const newItem: CartItem = {
      id: `cart-book-${Date.now()}`,
      productId,
      variantId,
      productName: doc.title || product.name,
      variantName: `${doc.format} • ${doc.coverType}`,
      imageUrl: doc.cover.coverPhotoUrl,
      quantity: 1,
      unitPrice: price,
      totalPrice: price,
      type: 'book',
      document: doc,
      details: {
        theme: doc.theme,
        style: doc.style,
        spreadsCount: doc.spreads.length
      }
    };
    setCart(prev => [...prev, newItem]);
    setEditingProject(null);
    setPreviousTab(activeTab);
    setActiveTab('cart');
  };

  const handleAddPrintsToCart = (item: CartItem) => {
    setCart(prev => [...prev, item]);
    setPreviousTab(activeTab);
    setActiveTab('cart');
  };

  useEffect(() => {
    if (!cart.length) return;
    const controller = new AbortController();
    quoteOrder(cart, appliedPromo, controller.signal)
      .then(quote => setPricedCart({ items: cart, promo: appliedPromo, quote }))
      .catch(error => {
        if (!controller.signal.aborted) {
          setPricedCart({ items: cart, promo: appliedPromo, error: error.message });
        }
      });
    return () => controller.abort();
  }, [cart, appliedPromo]);

  const currentPricing = pricedCart?.items === cart && pricedCart.promo === appliedPromo ? pricedCart : null;
  const quote = currentPricing?.quote;
  const cartSubtotal = quote?.subtotal ?? cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const cartDiscount = quote?.discountAmount ?? 0;
  const cartTotal = cartSubtotal - cartDiscount;

  const handleApplyPromo = () => {
    const code = promoCodeInput.trim().toUpperCase();
    if (code === appliedPromo && currentPricing?.error) setCart(items => [...items]);
    setAppliedPromo(code);
  };

  const handleRemoveCartItem = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const handleDuplicateProject = async (id: string) => {
    try {
      await duplicateProject(id);
      await loadAllData();
    } catch (err: any) {
      alert('Ошибка: ' + err.message);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (confirm('Удалить этот макет фотокниги?')) {
      try {
        await deleteProject(id);
        await loadAllData();
      } catch (err: any) {
        alert('Ошибка: ' + err.message);
      }
    }
  };

  const handleCreateSupportTicket = async () => {
    if (!ticketMessage.trim()) return;
    try {
      await createTicket({
        orderId: supportModalOrder?.id,
        subject: ticketSubject,
        message: ticketMessage
      });
      setTicketSuccess(true);
      setTimeout(() => {
        setTicketSuccess(false);
        setSupportModalOrder(null);
        setTicketMessage('');
      }, 2000);
    } catch (err: any) {
      alert('Ошибка: ' + err.message);
    }
  };

  const editingProduct = products.find(product => product.id === editingProject?.productId);
  const editingPrice = editingProduct?.variants.find(variant => variant.id === editingProject?.variantId)?.totalPrice
    ?? editingProduct?.basePrice;

  return (
    <div className="min-h-screen bg-[#EAE5DC] flex items-center justify-center p-0 sm:py-6 text-[#364C49] font-sans selection:bg-[#DD5757] selection:text-white">
      {/* Mobile Smartphone Frame Container */}
      <div className="w-full max-w-[420px] min-h-screen sm:min-h-[860px] sm:max-h-[920px] bg-[#F6EFE6] sm:rounded-[44px] shadow-2xl relative flex flex-col overflow-hidden sm:ring-8 sm:ring-black/10">
        
        {/* NATIVE MOBILE STATUS BAR */}
        <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md px-6 pt-3 pb-1 flex items-center justify-between text-[#364C49] text-xs font-bold select-none border-b border-transparent">
          {/* Time */}
          <span className="tracking-tight text-xs">9:41</span>

          {/* Dynamic Island Notch */}
          <div className="w-24 h-5 bg-black rounded-full flex items-center justify-end px-2 space-x-1.5 shadow-inner">
            <div className="w-2.5 h-2.5 rounded-full bg-[#1A1A1A] border border-[#333] flex items-center justify-center">
              <div className="w-1 h-1 rounded-full bg-[#0E3D59]" />
            </div>
          </div>

          {/* Icons: Signal, Wifi, Battery */}
          <div className="flex items-center space-x-1.5 text-[#364C49]">
            <Signal className="w-3.5 h-3.5" />
            <Wifi className="w-3.5 h-3.5" />
            <div className="flex items-center space-x-0.5">
              <span className="text-[10px]">100%</span>
              <BatteryCharging className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
        </div>

        {/* Application Header (Cart, Hotline, Role toggle for jury) */}
        <Header
          cartCount={cart.length}
          onOpenCart={canOrder ? handleOpenCart : undefined}
          onOpenAuth={isGuest ? onOpenAuth : undefined}
          onSignOut={isGuest ? undefined : onSignOut}
          isOperator={isOperator}
        />

        {/* Scrollable Screen Content */}
        <main className="flex-1 overflow-y-auto px-4 py-3 pb-24 space-y-4">
          {isGuest && (
            <p className="rounded-xl border border-[#EDE1D5] bg-white px-3 py-2 text-xs text-[#596c67]">
              Вы вошли как гость. Для сохранения макетов и заказа войдите в аккаунт.
            </p>
          )}
          
          {/* ========================================================= */}
          {/* 1. ГЛАВНАЯ (HOME) — Фото загрузка, редактор и обложка     */}
          {/* ========================================================= */}
          {activeTab === 'home' && (
            <HomePhotoCoverStudio
              product={classicBook}
              onBookReady={handleBookGenerated}
              onOpenPrints={() => openPrints(defaultPrints)}
              onOpenCatalog={() => setActiveTab('catalog')}
            />
          )}

          {/* ========================================================= */}
          {/* 1.5 ИДЕИ & РЕМИКС (IDEAS FEED) — Pinterest стена историй  */}
          {/* ========================================================= */}
          {activeTab === 'ideas' && (
            <IdeasRemixFeed
              onRemix={handleRemix}
              onOpenStudio={() => setActiveTab('home')}
            />
          )}

          {/* ========================================================= */}
          {/* 2. КАТАЛОГ (CATALOG) — Все позиции с сайта                */}
          {/* ========================================================= */}
          {activeTab === 'catalog' && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <h1 className="text-xl font-black text-[#364C49] tracking-tight">
                  Каталог продукции PicPac
                </h1>
                <p className="text-xs text-[#7C807F] mt-0.5">
                  Фотокниги, классическая фотопечать, холсты и магниты
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex space-x-2 overflow-x-auto no-scrollbar pb-1">
                {[
                  { id: 'all', label: 'Все позиции' },
                  { id: 'photobook', label: 'Фотокниги' },
                  { id: 'prints', label: 'Фотопечать' },
                  { id: 'canvas', label: 'Холсты и сувениры' }
                ].map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCatalogCategory(cat.id)}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      catalogCategory === cat.id
                        ? 'bg-[#364C49] text-white shadow-xs'
                        : 'bg-white text-[#7C807F] border border-[#BCBFB7]/60 hover:text-[#364C49]'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Products List from Site */}
              <div className="space-y-3.5">
                {products
                  .filter(p => {
                    if (catalogCategory === 'all') return true;
                    if (catalogCategory === 'photobook') return p.category.includes('photobook');
                    if (catalogCategory === 'prints') return p.category === 'prints';
                    if (catalogCategory === 'canvas') return p.category.includes('canvas') || p.category.includes('magnet');
                    return true;
                  })
                  .map(product => (
                    <article
                      key={product.id}
                      className="bg-white rounded-3xl p-4 border border-[#BCBFB7]/40 shadow-xs space-y-3 hover:border-[#364C49] transition-all"
                    >
                      <div className="relative h-44 rounded-2xl overflow-hidden bg-[#F6EFE6]">
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-xl text-xs font-black text-[#364C49] shadow-xs">
                          от {product.basePrice.toFixed(2)} BYN
                        </div>
                      </div>

                      <div>
                        <h3 className="text-base font-extrabold text-[#364C49]">
                          {product.name}
                        </h3>
                        <p className="text-xs text-[#7C807F] mt-1 leading-relaxed">
                          {product.description}
                        </p>
                      </div>

                      {/* Technical Specs */}
                      <div className="bg-[#F6EFE6] p-2.5 rounded-xl flex items-center justify-between text-xs text-[#7C807F]">
                        <span>Мин. {product.minPhotos} фото</span>
                        <span>{product.productionDays} {product.productionDays === 1 ? 'день' : 'дня'} готовности</span>
                      </div>

                      {/* Actions */}
                      <div className="pt-1 flex items-center space-x-2">
                        {product.category.includes('photobook') ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProductDetails(product);
                              setIsBookCreatorOpen(true);
                            }}
                            className="flex-1 py-3.5 rounded-xl bg-[#DD5757] hover:bg-[#c94b4b] text-white text-xs font-black flex items-center justify-center space-x-1.5 shadow-sm shadow-[#DD5757]/20 cursor-pointer"
                          >
                            <Sparkles className="w-4 h-4" />
                            <span>Создать с ИИ</span>
                          </button>
                        ) : product.category === 'prints' && product.variants.length && !isOperator ? (
                          <button
                            type="button"
                            onClick={() => openPrints(product)}
                            className="flex-1 py-3.5 rounded-xl bg-[#364C49] hover:bg-[#283836] text-white text-xs font-black flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer"
                          >
                            <Camera className="w-4 h-4" />
                            <span>{isGuest ? 'Войти для заказа' : 'Выбрать фотографии'}</span>
                          </button>
                        ) : (
                          <span className="py-2 text-xs text-[#7C807F]">Заказ пока недоступен</span>
                        )}
                      </div>
                    </article>
                  ))}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 3. МАКЕТЫ (DRAFTS / PROJECTS)                             */}
          {/* ========================================================= */}
          {!isGuest && activeTab === 'projects' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-black text-[#364C49] tracking-tight">
                    Мои макеты
                  </h1>
                  <p className="text-xs text-[#7C807F] mt-0.5">
                    Сохранённые фотокниги и черновики
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProductDetails(null);
                    setIsBookCreatorOpen(true);
                  }}
                  disabled={!classicBook}
                  className="px-3.5 py-1.5 rounded-xl bg-[#DD5757] text-white font-bold text-xs flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Новый</span>
                </button>
              </div>

              {projects.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 text-center border border-[#BCBFB7]/40 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-[#F6EFE6] text-[#DD5757] flex items-center justify-center mx-auto">
                    <Layers className="w-6 h-6" />
                  </div>
                  <h3 className="font-extrabold text-sm text-[#364C49]">
                    Нет сохранённых макетов
                  </h3>
                  <p className="text-xs text-[#7C807F] max-w-xs mx-auto">
                    Соберите фотокнигу и нажмите «Сохранить» в редакторе.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('home')}
                    className="px-5 py-2.5 rounded-xl bg-[#DD5757] text-white font-bold text-xs inline-flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Собрать на главной</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {projects.map(project => (
                    <div
                      key={project.id}
                      className="bg-white rounded-3xl p-4 border border-[#BCBFB7]/40 shadow-xs space-y-3"
                    >
                      <div className="flex items-start space-x-3">
                        <img
                          src={project.document?.cover?.coverPhotoUrl || project.productImageUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c'}
                          alt={project.title}
                          className="w-16 h-16 rounded-2xl object-cover shrink-0 border border-[#BCBFB7]/40"
                        />
                        <div className="flex-1 overflow-hidden">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-[#DD5757] bg-[#F6EFE6] px-2.5 py-0.5 rounded-full">
                              {project.status === 'ordered' ? 'Заказ оформлен' : 'Черновик'}
                            </span>
                            <span className="text-[11px] text-[#7C807F]">
                              {new Date(project.updatedAt).toLocaleDateString('ru-RU')}
                            </span>
                          </div>
                          <h3 className="font-extrabold text-sm text-[#364C49] mt-1 truncate">
                            {project.title}
                          </h3>
                          <span className="text-xs text-[#7C807F] block">
                            {project.productName} • {project.document?.format || '20×20 см'}
                          </span>
                        </div>
                      </div>

                      {/* Project actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-[#BCBFB7]/30 text-xs">
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => handleDuplicateProject(project.id)}
                            className="p-2 rounded-lg text-[#7C807F] hover:bg-[#F6EFE6] hover:text-[#364C49] cursor-pointer"
                            title="Дублировать макет"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProject(project.id)}
                            className="p-2 rounded-lg text-[#7C807F] hover:bg-red-50 hover:text-red-600 cursor-pointer"
                            title="Удалить макет"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex items-center space-x-2">
                          {canOrder && project.document && (
                            <button
                              type="button"
                              onClick={() => {
                                handleAddBookToCart(project.document!, project.productId, project.variantId);
                              }}
                              className="px-3.5 py-2 rounded-xl bg-[#F6EFE6] text-[#364C49] hover:bg-[#EAECE7] font-bold cursor-pointer"
                            >
                              В корзину
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              if (project.document) {
                                setEditingProject({
                                  doc: project.document, projectId: project.id,
                                  productId: project.productId, variantId: project.variantId
                                });
                              }
                            }}
                            className="px-4 py-2 rounded-xl bg-[#DD5757] text-white hover:bg-[#c94b4b] font-bold cursor-pointer"
                          >
                            Открыть
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* 4. КОРЗИНА (CART) — Открывается сверху, удобный возврат   */}
          {/* ========================================================= */}
          {canOrder && activeTab === 'cart' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-black text-[#364C49] tracking-tight">
                    Корзина заказа
                  </h1>
                  <p className="text-xs text-[#7C807F] mt-0.5">
                    Фотокниги и печать в одном заказе
                  </p>
                </div>
                {/* Back to browsing button */}
                <button
                  type="button"
                  onClick={handleBackFromCart}
                  className="px-3 py-1.5 rounded-xl bg-white border border-[#BCBFB7]/60 text-xs font-bold text-[#364C49] hover:bg-[#F6EFE6] flex items-center space-x-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Назад</span>
                </button>
              </div>

              {cart.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 text-center border border-[#BCBFB7]/40 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-[#F6EFE6] text-[#DD5757] flex items-center justify-center mx-auto">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <h3 className="font-extrabold text-sm text-[#364C49]">
                    Корзина пуста
                  </h3>
                  <p className="text-xs text-[#7C807F] max-w-xs mx-auto">
                    Создайте фотокнигу на главной странице или закажите фотопечать в каталоге.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('home')}
                    className="px-5 py-2.5 rounded-xl bg-[#364C49] text-white font-bold text-xs cursor-pointer"
                  >
                    Перейти к выбору
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Cart Items */}
                  <div className="space-y-2.5">
                    {cart.map(item => (
                      <div
                        key={item.id}
                        className="bg-white rounded-2xl p-3.5 border border-[#BCBFB7]/40 shadow-xs flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-3 overflow-hidden">
                          <img
                            src={item.imageUrl}
                            alt={item.productName}
                            className="w-14 h-14 object-cover rounded-xl shrink-0 border border-[#BCBFB7]/40"
                          />
                          <div className="overflow-hidden">
                            <h4 className="font-extrabold text-xs text-[#364C49] truncate">
                              {item.productName}
                            </h4>
                            <span className="text-[11px] text-[#7C807F] block">
                              {item.variantName}
                            </span>
                            <span className="text-xs font-black text-[#DD5757] block mt-0.5">
                              {item.totalPrice.toFixed(2)} BYN
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveCartItem(item.id)}
                          className="p-2 text-[#7C807F] hover:text-red-600 rounded-lg cursor-pointer"
                          title="Удалить позицию"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Promo Code Input */}
                  <div className="bg-white rounded-2xl p-3 border border-[#BCBFB7]/40 flex items-center space-x-2">
                    <input
                      type="text"
                      value={promoCodeInput}
                      onChange={e => setPromoCodeInput(e.target.value)}
                      placeholder="Промокод (START10, HACKATHON)"
                      className="flex-1 bg-[#F6EFE6]/50 border border-[#BCBFB7]/60 rounded-xl px-3 py-1.5 text-xs text-[#364C49] font-bold uppercase focus:outline-none focus:border-[#DD5757]"
                    />
                    <button
                      type="button"
                      onClick={handleApplyPromo}
                      className="px-3.5 py-1.5 rounded-xl bg-[#364C49] text-white font-bold text-xs cursor-pointer"
                    >
                      Применить
                    </button>
                  </div>

                  {(currentPricing?.error || quote?.promoError) && (
                    <p role="status" className="px-1 text-xs text-[#9A352F]">
                      {currentPricing?.error || quote?.promoError}
                    </p>
                  )}

                  {/* Pricing Breakdown Card */}
                  <div className="bg-white rounded-2xl p-4 border border-[#BCBFB7]/40 space-y-2 text-xs">
                    <div className="flex justify-between text-[#7C807F]">
                      <span>Товары ({cart.length} поз.):</span>
                      <span className="font-bold text-[#364C49]">{cartSubtotal.toFixed(2)} BYN</span>
                    </div>
                    {cartDiscount > 0 && (
                      <div className="flex justify-between text-emerald-700">
                        <span>Скидка ({appliedPromo}):</span>
                        <span className="font-bold">- {cartDiscount.toFixed(2)} BYN</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-[#BCBFB7]/30 pt-2 font-black text-sm text-[#364C49]">
                      <span>Итого без доставки:</span>
                      <span className="text-[#DD5757] text-base">{cartTotal.toFixed(2)} BYN</span>
                    </div>
                  </div>

                  {/* Checkout Button */}
                  <button
                    type="button"
                    onClick={() => setIsCheckoutOpen(true)}
                    disabled={!quote}
                    className="disabled:opacity-50 disabled:cursor-wait w-full py-4 rounded-2xl bg-[#DD5757] hover:bg-[#c94b4b] text-white font-black text-sm flex items-center justify-center space-x-2 shadow-lg shadow-[#DD5757]/20 cursor-pointer transition-all active:scale-[0.98]"
                  >
                    <span>{!currentPricing ? 'Расчёт стоимости…' : 'Оформить заказ'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* 5. ПРОФИЛЬ И НАСТРОЙКИ (PROFILE & SETTINGS)              */}
          {/* ========================================================= */}
          {!isGuest && activeTab === 'profile' && (
            <div className="space-y-4 animate-fadeIn">
              {isOperator ? (
                <OperatorPanel />
              ) : (
                <DeliveryTracker
                  orders={orders}
                  currentUser={user}
                  onOpenSupport={(order) => {
                    setSupportModalOrder(order);
                    setTicketSubject(`Вопрос по заказу #${order.orderNumber}`);
                  }}
                  onRefresh={loadAllData}
                />
              )}
            </div>
          )}

        </main>

        {/* NATIVE BOTTOM NAVIGATION (4 clean tabs: Главная, Каталог, Макеты, Профиль) */}
        <BottomNav
          activeTab={activeTab === 'cart' ? '' : activeTab}
          isGuest={isGuest}
          isOperator={isOperator}
          onTabChange={setActiveTab}
        />

        {/* NATIVE HOME INDICATOR BAR (iOS/Android) */}
        <div className="absolute bottom-1 left-0 right-0 z-50 pointer-events-none flex justify-center">
          <div className="w-32 h-1 bg-black/25 rounded-full" />
        </div>

        {/* MODAL 1: BOOK CREATOR WIZARD */}
        {isBookCreatorOpen && (
          <BookCreatorModal
            products={products}
            selectedProduct={selectedProductDetails || undefined}
            onClose={() => setIsBookCreatorOpen(false)}
            onBookGenerated={handleBookGenerated}
          />
        )}

        {/* MODAL 2: PRINTS ORDER */}
        {canOrder && printsProduct && (
          <PrintsOrderModal
            products={products}
            initialProduct={printsProduct}
            onClose={() => setPrintsProduct(null)}
            onAddToCart={handleAddPrintsToCart}
          />
        )}

        {/* MODAL 3: FULL AI EDITOR */}
        {editingProject && (
          <AIEditor
            document={editingProject.doc}
            projectId={editingProject.projectId}
            price={editingPrice}
            onRequireAccount={isGuest ? onOpenAuth : undefined}
            onSave={async (updatedDoc) => {
              if (editingProject.projectId) {
                await updateProject(editingProject.projectId, { title: updatedDoc.title, document: updatedDoc });
              } else {
                const { id } = await createProject({
                  productId: editingProject.productId,
                  variantId: editingProject.variantId,
                  title: updatedDoc.title,
                  document: updatedDoc
                });
                setEditingProject(current => current === editingProject
                  ? { ...current, projectId: id }
                  : current);
              }
              await loadAllData();
            }}
            onAddToCart={canOrder ? doc => handleAddBookToCart(doc, editingProject.productId, editingProject.variantId) : undefined}
            onClose={() => setEditingProject(null)}
          />
        )}

        {/* MODAL 4: CHECKOUT */}
        {canOrder && isCheckoutOpen && (
          <CheckoutModal
            user={user}
            items={cart}
            subtotal={cartSubtotal}
            discountAmount={cartDiscount}
            promoCode={appliedPromo}
            onClose={completed => {
              setIsCheckoutOpen(false);
              if (completed) setActiveTab('profile');
            }}
            onOrderCompleted={() => {
              setCart([]);
              loadAllData();
            }}
          />
        )}

        {/* MODAL 5: SUPPORT TICKET */}
        {supportModalOrder && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 border border-[#BCBFB7]/40 shadow-2xl animate-scale">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-xl bg-[#DD5757] text-white flex items-center justify-center">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-[#364C49]">
                      Поддержка заказа
                    </h3>
                    <span className="text-[10px] text-[#7C807F]">
                      #{supportModalOrder.orderNumber}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSupportModalOrder(null)}
                  className="p-1 rounded-lg text-[#7C807F] hover:bg-[#F6EFE6]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {ticketSuccess ? (
                <div className="bg-emerald-50 text-emerald-800 p-4 rounded-2xl text-center space-y-1.5 border border-emerald-200">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-600" />
                  <p className="font-bold text-xs">Обращение принято!</p>
                  <p className="text-[11px] text-emerald-700">
                    Обращение сохранено и доступно в панели оператора.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-[#7C807F] block mb-1">
                      Тема вопроса
                    </label>
                    <input
                      type="text"
                      value={ticketSubject}
                      onChange={e => setTicketSubject(e.target.value)}
                      className="w-full bg-[#F6EFE6]/50 border border-[#BCBFB7]/60 rounded-xl px-3 py-1.5 text-xs text-[#364C49] font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-[#7C807F] block mb-1">
                      Сообщение
                    </label>
                    <textarea
                      rows={3}
                      value={ticketMessage}
                      onChange={e => setTicketMessage(e.target.value)}
                      placeholder="Опишите ваш вопрос (например, хотите изменить адрес доставки или уточнить время выдачи)..."
                      className="w-full bg-[#F6EFE6]/50 border border-[#BCBFB7]/60 rounded-xl p-3 text-xs text-[#364C49]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateSupportTicket}
                    className="w-full py-3 rounded-xl bg-[#DD5757] text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-[#DD5757]/20 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Отправить в лабораторию</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
