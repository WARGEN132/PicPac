import { Router, Request, Response } from 'express';
import { getDatabase } from '../db/database';

export const productsRouter = Router();

// GET /api/products — Get all active products with variants
productsRouter.get('/products', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const products = db.prepare(`
      SELECT * FROM products WHERE is_active = 1 ORDER BY base_price ASC
    `).all() as any[];

    const variants = db.prepare(`
      SELECT * FROM product_variants ORDER BY is_default DESC, price_modifier ASC
    `).all() as any[];

    const productsWithVariants = products.map(prod => {
      const prodVariants = variants
        .filter(v => v.product_id === prod.id)
        .map(v => ({
          id: v.id,
          name: v.name,
          sku: v.sku,
          priceModifier: v.price_modifier,
          totalPrice: Math.round((prod.base_price + v.price_modifier) * 100) / 100,
          isDefault: Boolean(v.is_default),
          attributes: v.attributes_json ? JSON.parse(v.attributes_json) : {}
        }));

      // Extract optional badge and originalPrice from default variant or seed
      const defaultVariant = prodVariants.find(v => v.isDefault) || prodVariants[0];
      const originalPrice = defaultVariant?.attributes?.originalPrice || (prod.slug === 'photobook-classic' ? 70.90 : prod.slug === 'photobook-lite' ? 60.00 : prod.slug === 'photobook-premium' ? 120.00 : undefined);
      const badge = prod.slug === 'photobook-classic' ? 'Хит • -45%' : prod.slug === 'photobook-lite' ? 'Выгодно • -25%' : prod.slug === 'photobook-premium' ? 'Премиум • -40%' : undefined;

      return {
        id: prod.id,
        slug: prod.slug,
        name: prod.name,
        category: prod.category,
        description: prod.description,
        basePrice: prod.base_price,
        originalPrice: originalPrice,
        badge: badge,
        currency: prod.currency,
        minResolution: {
          width: prod.min_resolution_width,
          height: prod.min_resolution_height
        },
        minPhotos: prod.min_photos,
        maxPhotos: prod.max_photos,
        productionDays: prod.production_days,
        imageUrl: prod.image_url,
        variants: prodVariants
      };
    });

    res.json({
      success: true,
      count: productsWithVariants.length,
      data: productsWithVariants
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Ошибка получения каталога продуктов: ' + err.message
    });
  }
});

// GET /api/products/:id — Get single product by id or slug
productsRouter.get('/products/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const prod = db.prepare(`
      SELECT * FROM products WHERE (id = ? OR slug = ?) AND is_active = 1
    `).get(id, id) as any;

    if (!prod) {
      res.status(404).json({
        success: false,
        error: 'Продукт не найден'
      });
      return;
    }

    const variants = db.prepare(`
      SELECT * FROM product_variants WHERE product_id = ? ORDER BY is_default DESC, price_modifier ASC
    `).all(prod.id) as any[];

    const formattedVariants = variants.map(v => ({
      id: v.id,
      name: v.name,
      sku: v.sku,
      priceModifier: v.price_modifier,
      totalPrice: Math.round((prod.base_price + v.price_modifier) * 100) / 100,
      isDefault: Boolean(v.is_default),
      attributes: v.attributes_json ? JSON.parse(v.attributes_json) : {}
    }));

    res.json({
      success: true,
      data: {
        id: prod.id,
        slug: prod.slug,
        name: prod.name,
        category: prod.category,
        description: prod.description,
        basePrice: prod.base_price,
        currency: prod.currency,
        minResolution: {
          width: prod.min_resolution_width,
          height: prod.min_resolution_height
        },
        minPhotos: prod.min_photos,
        maxPhotos: prod.max_photos,
        productionDays: prod.production_days,
        imageUrl: prod.image_url,
        variants: formattedVariants
      }
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Ошибка получения продукта: ' + err.message
    });
  }
});
