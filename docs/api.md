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

## 3. Запланированные эндпоинты Этапа 2

- `POST /api/auth/login` — вход по email и паролю, выдача JWT токена
- `GET /api/auth/me` — получение данных текущего пользователя и роли
- `POST /api/projects` — создание нового проекта (черновика)
- `GET /api/projects/:id` — получение черновика проекта со всеми фото
- `PUT /api/projects/:id` — автосохранение настроек проекта
- `POST /api/photos/upload` — загрузка фотографий (multipart/form-data)
- `DELETE /api/photos/:id` — удаление фотографии
- `POST /api/orders` — оформление заказа с заголовком `Idempotency-Key`
- `GET /api/orders` — список заказов текущего пользователя (или всех для оператора)
- `GET /api/orders/:id` — статусная лента и детали заказа
- `PATCH /api/orders/:id/status` — смена статуса оператором (с фиксацией в истории)
- `POST /api/support/tickets` — создание обращения в поддержку по заказу
- `GET /api/audit-logs` — журнал действий (доступен роли `operator`)
