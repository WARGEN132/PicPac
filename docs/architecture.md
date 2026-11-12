# Архитектура picPac.by
ООО «Фотопринт» — Мобильное PWA-приложение для заказа фотопродукции со смартфона

## 1. Обзор системы

picPac.by спроектирован по принципу Mobile-First Progressive Web App с монолитным full-stack бекендом на Node.js / Express / SQLite:

```
+--------------------------------------------------------------------+
|                         Клиент (PWA)                               |
|   React 19 + TypeScript + Vite + Tailwind CSS v4                   |
|   - IndexedDB (Локальный черновик проекта, офлайн-режим)           |
|   - Service Worker & Web App Manifest (PWA установка на смартфон)  |
+---------------------------------+----------------------------------+
                                  | HTTP / JSON (REST API)
                                  v
+---------------------------------+----------------------------------+
|                      Бэкенд Сервер (Express)                       |
|   /server.ts (Express + Vite Middlewares в dev / dist в prod)      |
|   - Auth & RBAC Middleware (роли: customer, operator, guest)       |
|   - API Routers: /api/health, /api/products, /api/orders...        |
|   - Idempotency-Key Middleware (защита от повторных списаний)      |
|   - Audit Logging Engine (таблица audit_logs с таймзонами)         |
+-----------------+--------------------------------+-----------------+
                  |                                |
                  v                                v
+-----------------+------------------+   +----------+----------------+
|    База данных (SQLite / WAL)      |   |       AI Слой (Слой 5)    |
|    better-sqlite3                  |   | PhotoAnalyzer Интерфейс:  |
|    - users & customers             |   | - Mock provider (default) |
|    - products & product_variants   |   | - OpenAI Vision API       |
|    - projects & photos             |   | - Local model             |
|    - orders & order_items          |   +---------------------------+
|    - support_tickets & audit_logs  |
+------------------------------------+
```

## 2. Структура каталогов

```
/
├── client/              # Клиентская часть (PWA)
│   ├── public/          # PWA манифест, иконки
│   └── src/             # Компоненты, сервисы API, типизация
├── server/              # Серверная часть API
│   └── src/
│       ├── ai/          # AI-интерфейс PhotoAnalyzer и провайдеры (mock, openai)
│       ├── db/          # better-sqlite3: schema.sql, database.ts, seed.ts
│       └── routes/      # REST API контроллеры (/api/health, /api/products...)
├── data/                # Сид-данные и файл БД (picpac.db, products_seed.json)
├── docs/                # Документация (архитектура, API, формулы цен, отчёт о тестах)
├── LICENSES.md          # Аудит используемых библиотек и лицензий
├── README.md            # Инструкция по быстрому запуску и проверке
├── .env.example         # Переменные окружения без секретов
└── server.ts            # Точка входа Express + Vite dev middleware
```

## 3. Схема данных SQLite

Все таблицы строго типизированы, связаны внешними ключами (`PRAGMA foreign_keys = ON;`) и работают в высокопроизводительном режиме журнала `WAL` (`PRAGMA journal_mode = WAL;`):

- **users**: Аккаунты, роли (`customer`, `operator`, `guest`), bcrypt-хеши паролей.
- **customers**: Профили клиентов (ФИО, телефон, адрес доставки).
- **products**: Каталог продукции (мин/макс фото, мин. разрешение, срок изготовления, базовая цена в BYN).
- **product_variants**: Варианты и форматы продукции (размеры, типы переплёта, натяжки, бумага) с `price_modifier`.
- **projects**: Проекты/черновики пользователей с JSON-настройками и автосохранением.
- **photos**: Фотографии проектов, слоты, размеры, оценки качества, blur_score, phash.
- **orders**: Заказы с `idempotency_key`, способами доставки, промокодами и суммами в BYN.
- **order_items**: Позиции заказа со слепком продукта (`product_snapshot_json`).
- **order_status_history**: Полная статусная лента (принят → модерация → производство → готов → завершён).
- **support_tickets**: Обращения в поддержку, привязанные к конкретным заказам.
- **promo_codes**: Промокоды с процентными и фиксированными скидками в BYN.
- **audit_logs**: Полный аудит действий системы с метками времени ISO и часовыми поясами.
- **idempotency_keys**: Кэш ответов на основе Idempotency-Key.
