export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  priceModifier: number;
  totalPrice: number;
  isDefault: boolean;
  attributes: Record<string, any>;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: string;
  categoryName?: string;
  description: string;
  basePrice: number;
  originalPrice?: number;
  currency: string;
  minResolution: {
    width: number;
    height: number;
  };
  minPhotos: number;
  maxPhotos: number;
  productionDays: number;
  imageUrl: string;
  badge?: string;
  features?: string[];
  variants: ProductVariant[];
}

export interface BookElement {
  id: string;
  type: 'photo' | 'text' | 'decor';
  x: number; // 0 to 100%
  y: number; // 0 to 100%
  width: number; // 0 to 100%
  height: number; // 0 to 100%
  zIndex: number;
  photoUrl?: string;
  caption?: string;
  crop?: { scale: number; offsetX: number; offsetY: number };
  text?: string;
  fontSize?: number;
  color?: string;
  align?: 'left' | 'center' | 'right';
  decorType?: string;
}

export interface BookPage {
  id: string;
  pageNumber: number;
  backgroundColor: string;
  elements: BookElement[];
}

export interface BookSpread {
  id: string;
  spreadIndex: number;
  title: string;
  leftPage: BookPage;
  rightPage: BookPage;
}

export interface PhotobookDocument {
  version: string;
  title: string;
  theme: string;
  style: string;
  format: string;
  coverType: string;
  cover: {
    title: string;
    subtitle: string;
    coverPhotoUrl: string;
    backgroundColor: string;
    material: string;
    fontFamily: string;
  };
  spreads: BookSpread[];
  productionSettings: {
    widthMm: number;
    heightMm: number;
    safeZoneMm: number;
    bleedMm: number;
    spineMm: number;
  };
}

export interface Project {
  id: string;
  userId: string;
  productId: string;
  variantId?: string;
  productName: string;
  productCategory: string;
  productImageUrl: string;
  title: string;
  status: 'draft' | 'ready' | 'in_cart' | 'ordered';
  document?: PhotobookDocument;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  id: string;
  projectId?: string;
  productId: string;
  variantId?: string;
  productName: string;
  variantName?: string;
  imageUrl: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  type: 'book' | 'prints';
  photos?: { url: string; count: number }[];
  details?: Record<string, any>;
  document?: PhotobookDocument;
}

export interface OrderHistoryItem {
  id: string;
  status: string;
  comment: string;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  status: 'received' | 'moderation' | 'production' | 'ready_for_delivery' | 'completed' | 'cancelled';
  totalAmount: number;
  discountAmount: number;
  deliveryAmount: number;
  currency: string;
  trackingNumber?: string;
  deliveryMethod: string;
  deliveryAddress: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  createdAt: string;
  updatedAt: string;
  itemsCount: number;
  items?: any[];
  history?: OrderHistoryItem[];
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  orderId?: string;
  orderNumber?: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  createdAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: 'customer' | 'operator' | 'guest';
  name: string;
  phone?: string;
  address?: string;
}


export interface OrderQuote {
  subtotal: number;
  deliveryAmount: number;
  discountAmount: number;
  totalAmount: number;
  promoError: string | null;
}

export type CreatedOrder = Pick<Order, 'id' | 'orderNumber' | 'totalAmount' | 'deliveryAmount'>;
