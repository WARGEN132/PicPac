# Спецификация REST API picPac.by
ООО «Фотопринт» — Версия API: v1

Все ответы возвращаются в формате `application/json` в кодировке UTF-8.

---

## 1. Системные эндпоинты

### `GET /api/health`
Проверка состояния сервера, подключения к SQLite и статистики базы данных.

**Пример ответа (200 OK):**
```json
{
  "status": "ok",
  "service": "picPac.by API",
  "organization": "ООО «Фотопринт»",
  "environment": "development",
  "timestamp": "2026-11-11T12:00:00.000Z",
  "database": {
    "engine": "SQLite (better-sqlite3)",
    "status": "connected",
    "stats": {
      "products": 5,
      "orders": 520,
      "users": 222,
      "customers": 222,
      "tickets": 310
    }
  }
}
```

---

## 2. Каталог продукции

### `GET /api/products`
Возвращает список всех активных продуктов с их вариантами, техническими требованиями и ценами в BYN.

**Пример ответа (200 OK):**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": "prod-photo-prints",
      "slug": "photo-prints",
      "name": "Классическая фотопечать",
      "category": "prints",
      "description": "Настоящая химическая фотопечать на японской бумаге Fujifilm...",
      "basePrice": 0.65,
      "currency": "BYN",
      "minResolution": { "width": 1200, "height": 1800 },
      "minPhotos": 1,
      "maxPhotos": 200,
      "productionDays": 1,
      "imageUrl": "https://...",
      "variants": [
        {
          "id": "var-print-10x15",
          "name": "10 × 15 см (Стандарт)",
          "sku": "PR-1015",
          "priceModifier": 0.0,
          "totalPrice": 0.65,
          "isDefault": true,
          "attributes": { "size": "10x15 см" }
        }
      ]
    }
  ]
}
```

### `GET /api/products/:id`
Возвращает подробную информацию о конкретном продукте по `id` или `slug`.

---

## 3. Проекты и заказы

Для доступа к макетам, заказам и обращениям браузер передаёт cookie сессии
`picpac_session`. Сервер определяет владельца и роль по сессии.

- `POST /api/auth/login` — вход по email и паролю.
- `POST /api/auth/register` — регистрация покупателя по имени, email и паролю
  от 8 символов. Телефон и адрес необязательны.
- `POST /api/auth/anonymous` — гостевая сессия для каталога и предпросмотра.
- `GET /api/auth/me` — профиль текущей сессии или `{ "user": null }`.
- `POST /api/auth/logout` — завершение текущей сессии.
- `POST /api/projects` — создание черновика с `productId`, необязательным `variantId` и макетом `document`.
- `GET /api/projects/:id` — получение сохранённого макета.
- `PUT /api/projects/:id` — обновление макета.
- `POST /api/orders/quote` — расчёт стоимости без создания заказа. Передайте
  `items` с полями `productId`, `quantity` и необязательным `variantId`.
  Можно добавить `promoCode` и `deliveryMethod`. Ответ содержит `subtotal`,
  `discountAmount`, `deliveryAmount`, `totalAmount` и `promoError`.
- `POST /api/orders` — оформление заказа с заголовком `Idempotency-Key`.
  Сервер рассчитывает цены по каталогу. Повтор того же запроса с тем же ключом
  возвращает созданный заказ. Повторное использование ключа для другого заказа
  возвращает HTTP 409.
- `GET /api/orders` — список заказов.
- `GET /api/orders/:id` — детали и история статусов по ID или номеру заказа.
- `PATCH /api/orders/:id/status` — изменение статуса и запись в истории.
- `POST /api/support/tickets` — создание обращения в поддержку.
- `GET /api/audit-logs` — журнал действий в демо.

Поддерживаемые коды доставки и формулы описаны в [расчёте стоимости](pricing_formula.md).
