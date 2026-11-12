import { readPhoto } from '../services/photos';
import React, { useState } from 'react';
import { Product, ProductVariant, CartItem } from '../types';
import { X, Upload, Plus, Minus, Check, ShoppingBag, Image as ImageIcon, ShieldCheck } from 'lucide-react';

interface PrintsOrderModalProps {
  products: Product[];
  initialProduct: Product;
  onClose: () => void;
  onAddToCart: (item: CartItem) => void;
}

export const PrintsOrderModal: React.FC<PrintsOrderModalProps> = ({
  products,
  initialProduct,
  onClose,
  onAddToCart
}) => {
  const printsProducts = products.filter(p => p.category === 'prints' && p.variants.length > 0);
  const [selectedProduct, setSelectedProduct] = useState<Product>(initialProduct);
  
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant>(
    selectedProduct.variants[0]
  );
  const [paperType, setPaperType] = useState<'matte' | 'glossy'>('matte');

  // Sample photos for quick prints ordering
  const [photos, setPhotos] = useState<{ id: string; url: string; count: number }[]>([
    { id: '1', url: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=600&q=80', count: 2 },
    { id: '2', url: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=600&q=80', count: 1 },
    { id: '3', url: 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?auto=format&fit=crop&w=600&q=80', count: 3 },
    { id: '4', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80', count: 1 }
  ]);

  const [usingSamplePhotos, setUsingSamplePhotos] = useState(true);

  const unitPrice = selectedVariant.totalPrice || selectedProduct.basePrice;
  const totalPrintsCount = photos.reduce((acc, p) => acc + p.count, 0);
  const totalPrice = Math.round(totalPrintsCount * unitPrice * 100) / 100;

  const handleUpdateCount = (id: string, delta: number) => {
    setPhotos(prev =>
      prev.map(p => {
        if (p.id === id) {
          return { ...p, count: Math.max(1, p.count + delta) };
        }
        return p;
      })
    );
  };

  const handleUploadNewPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!files.length) return;
    try {
      const urls = await Promise.all(files.map(readPhoto));
      const uploaded = urls.map((url, index) => ({ id: `upload-${Date.now()}-${index}`, url, count: 1 }));
      setPhotos(previous => usingSamplePhotos ? uploaded : [...previous, ...uploaded]);
      setUsingSamplePhotos(false);
    } catch (error) {
      alert((error as Error).message);
    }
  };

  const handleAddToCart = () => {
    const cartItem: CartItem = {
      id: `cart-prints-${Date.now()}`,
      productId: selectedProduct.id,
      variantId: selectedVariant.id,
      productName: selectedProduct.name,
      variantName: `${selectedVariant.name} (${paperType === 'matte' ? 'Матовая' : 'Глянцевая'})`,
      imageUrl: photos[0]?.url || selectedProduct.imageUrl,
      quantity: totalPrintsCount,
      unitPrice,
      totalPrice,
      type: 'prints',
      photos: photos.map(({ url, count }) => ({ url, count })),
      details: {
        photosCount: photos.length,
        printsCount: totalPrintsCount,
        format: selectedVariant.name,
        paperType: paperType === 'matte' ? 'Матовая' : 'Глянцевая'
      }
    };

    onAddToCart(cartItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#364C49]/40 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-md h-full sm:h-[88vh] bg-white sm:rounded-3xl flex flex-col shadow-2xl overflow-hidden border border-[#BCBFB7]/40">
        
        {/* Header */}
        <div className="bg-white border-b border-[#BCBFB7]/40 px-4 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#364C49]">
              Заказ фотопечати
            </h2>
            <p className="text-[11px] text-[#7C807F]">
              Загрузите свои фото или используйте демонстрационный набор
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#7C807F] hover:bg-[#F6EFE6] hover:text-[#364C49]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F6EFE6]/30">
          
          {/* Print Type Selection */}
          <div>
            <label className="text-xs font-bold text-[#364C49] uppercase tracking-wider block mb-1.5">
              Технология печати:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {printsProducts.map(p => {
                const isSelected = selectedProduct.id === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedProduct(p);
                      setSelectedVariant(p.variants[0]);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white border-[#DD5757] shadow-xs'
                        : 'bg-white/70 border-[#BCBFB7]/60 hover:border-[#364C49]'
                    }`}
                  >
                    <span className="font-bold text-xs text-[#364C49] block">{p.name}</span>
                    <span className="text-[11px] text-[#7C807F] block mt-0.5">от {p.basePrice.toFixed(2)} BYN</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Size / Format */}
          <div>
            <label className="text-xs font-bold text-[#364C49] uppercase tracking-wider block mb-1.5">
              Формат отпечатков:
            </label>
            <div className="grid grid-cols-1 gap-1.5">
              {selectedProduct.variants.map(v => {
                const isSelected = selectedVariant.id === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedVariant(v)}
                    className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white border-[#DD5757] font-bold text-[#364C49] shadow-xs'
                        : 'bg-white/80 border-[#BCBFB7]/60 text-[#7C807F] hover:text-[#364C49]'
                    }`}
                  >
                    <span>{v.name}</span>
                    <span className="font-bold text-[#DD5757]">{v.totalPrice.toFixed(2)} BYN / шт.</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Paper Type */}
          <div>
            <label className="text-xs font-bold text-[#364C49] uppercase tracking-wider block mb-1.5">
              Тип бумаги:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaperType('matte')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                  paperType === 'matte'
                    ? 'bg-[#364C49] text-white border-[#364C49]'
                    : 'bg-white text-[#364C49] border-[#BCBFB7]/60'
                }`}
              >
                Матовая (без бликов)
              </button>
              <button
                type="button"
                onClick={() => setPaperType('glossy')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                  paperType === 'glossy'
                    ? 'bg-[#364C49] text-white border-[#364C49]'
                    : 'bg-white text-[#364C49] border-[#BCBFB7]/60'
                }`}
              >
                Глянцевая (яркие цвета)
              </button>
            </div>
          </div>

          {/* Photos & Quantity List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#364C49] uppercase tracking-wider">
                Снимки и количество копий:
              </span>
              <label className="text-xs font-bold text-[#DD5757] hover:underline cursor-pointer flex items-center space-x-1">
                <Upload className="w-3.5 h-3.5" />
                <span>{usingSamplePhotos ? 'Загрузить свои фото' : '+ Добавить фото'}</span>
                <input type="file" multiple accept="image/*" onChange={handleUploadNewPhotos} className="hidden" />
              </label>
            </div>

            <div className="space-y-2">
              {photos.map(p => (
                <div
                  key={p.id}
                  className="bg-white p-2.5 rounded-xl border border-[#BCBFB7]/50 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <img src={p.url} alt="print" className="w-12 h-12 object-cover rounded-lg" />
                    <div>
                      <span className="text-xs font-bold text-[#364C49] block">
                        {selectedVariant.name}
                      </span>
                      <span className="text-[11px] text-[#7C807F]">
                        {(p.count * unitPrice).toFixed(2)} BYN
                      </span>
                    </div>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center space-x-2 bg-[#F6EFE6] px-2 py-1 rounded-lg border border-[#BCBFB7]/40">
                    <button
                      type="button"
                      onClick={() => handleUpdateCount(p.id, -1)}
                      className="w-5 h-5 flex items-center justify-center text-[#364C49] hover:bg-white rounded font-bold"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-extrabold text-[#364C49] w-4 text-center">
                      {p.count}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateCount(p.id, 1)}
                      className="w-5 h-5 flex items-center justify-center text-[#364C49] hover:bg-white rounded font-bold"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-white border-t border-[#BCBFB7]/40 p-3 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-[#7C807F] block">Всего: {totalPrintsCount} отпечатков</span>
            <span className="text-base font-extrabold text-[#364C49]">
              {totalPrice.toFixed(2)} <span className="text-xs text-[#DD5757]">BYN</span>
            </span>
          </div>
          <button
            type="button"
            onClick={handleAddToCart}
            className="px-5 py-2.5 rounded-xl bg-[#DD5757] hover:bg-[#c94b4b] text-white text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-[#DD5757]/20 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>В корзину</span>
          </button>
        </div>

      </div>
    </div>
  );
};
