# Cimbil Backend - Task Listesi

Son güncelleme: 2026-03-02 (Railway deploy session)
Not: Proje TypeScript ile yazılıyor (strict mode). Her servis kendi tsconfig.json'una sahip. Multi-stage Dockerfile.

## Durum Açıklaması
- [ ] Bekliyor
- [x] Tamamlandı
- [~] Devam ediyor

---

## 🐳 Altyapı

- [x] **#1** Docker Compose + .env.example oluştur
  - docker-compose.yml: 6 servis + 4 PostgreSQL + 2 MongoDB container, internal network, health check'ler, volume persistence
  - .env.example: JWT_SECRET, NODEMAILER, iyzico anahtarları, plan fiyatları, tüm DB URL'leri

---

## 🔀 API Gateway (:8080)

- [x] **#2** Temel yapı + route yönlendirme
  - /api/v1/users→3001, /api/v1/auth→3001, /api/v1/nutrition+food→3002, /api/v1/recipes→3003, /api/v1/health→3004, /api/v1/cimbil→3005, /api/v1/subscriptions+admin→3006
- [x] **#3** JWT middleware
  - Public route'ları bypass et, diğerlerinde JWT doğrula, x-user-id header ekle
- [x] **#4** Rate limiting
  - /login, /register, /forgot-password → 10 req/dk | Diğerleri → 100 req/dk
  - `app.set('trust proxy', 1)` eklendi — Railway reverse proxy uyumluluğu
- [x] **#5** Subscription middleware
  - Korunan feature route'ları: food_analysis, ai_chat, recipes, barcode_scan, health_sync
  - check → proxy → increment akışı, limit aşıldığında 403 LIMIT_REACHED
- [x] **#6** Admin middleware
  - /api/v1/admin/** → JWT doğrula + role === "admin" kontrolü

---

## 👤 User Service (:3001) — PostgreSQL (user_db) / Prisma

- [x] **#7** Proje iskeleti
  - package.json (express, prisma, bcryptjs, jsonwebtoken, nodemailer, zod, axios)
  - src/app.js, controllers/, routes/, services/, middleware/, utils/
  - response.helper.js, error.handler.js
- [x] **#8** Prisma schema
  - User, VerificationCode, Profile, StreakData, ChatMessage modelleri
- [x] **#9** Auth endpoints — register / verify-email / resend-code
  - register: email unique, bcrypt hash, user oluştur, 6 haneli kod, email gönder
  - verify-email: kod doğrula, isVerified=true, süresiz JWT üret
  - resend-code: eski kodları iptal, yeni kod + email
- [x] **#10** Auth endpoints — login / forgot-password / reset-password
  - login: user bul, isVerified kontrol, bcrypt.compare, JWT üret
  - forgot-password: 6 haneli kod (password_reset, 15dk), email
  - reset-password: kod doğrula, şifre güncelle
- [x] **#11** Profile endpoints + Swagger UI + Prisma Studio script
  - POST /profile: username unique, Mifflin-St Jeor kalori hesabı, dailyWaterGoal=weight*35, upsert
  - PUT /profile: partial update, kalori/su yeniden hesapla
  - GET /profile, GET /me
- [x] **#12** Chat history endpoints
  - GET /chat-history (?limit=50&before=messageId), POST /chat-history, DELETE /chat-history
- [x] **#13** Streak endpoint
  - POST /streak/check: bugün/dün/sıfırla mantığı, longestStreak güncelle
- [x] **#14** Internal endpoints
  - GET /internal/profile/:userId
  - PATCH /internal/profile/:userId (activityLevel güncelle + kalori yeniden hesapla)

---

## 🥗 Nutrition Service (:3002) — PostgreSQL (nutrition_db) + MongoDB (food_db)

- [x] **#15** Proje iskeleti + şemalar
  - package.json (express, prisma, mongoose, multer, axios, zod)
  - Prisma: NutritionLog (PostgreSQL/nutrition_db)
  - Mongoose: BarcodeCache (MongoDB/food_db) → src/models/BarcodeCache.js
- [x] **#16** Log endpoints
  - GET /nutrition/get-by-date?date: loglar + User Service'ten dailyCalorieGoal + toplamlar
  - POST /nutrition/log: log oluştur + streak/check tetikle
  - DELETE /nutrition/log/:id: userId kontrolü
  - GET /nutrition/history?startDate&endDate: günlük özet (grafik)
- [x] **#17** Food endpoints (barcode + image analizi + internal log)
  - GET /food/barcode/:barcode: MongoDB cache → Open Food Facts API → kaydet
  - POST /food/analyze-image: Multer → base64 → AI Service /analyze-image
  - POST /internal/log: Recipe Service'ten gelen log
- [x] **#17a** NutritionLog'a `details Json?` alanı eklendi
  - AI fotoğraf analizi sonuçlarını saklamak için opsiyonel JSON array
  - createLog ve createInternalLog her ikisi de destekliyor
  - ⚠️ Railway'de `prisma migrate deploy` çalıştırılmalı

---

## 📖 Recipe Service (:3003) — MongoDB (recipe_db) / Mongoose

- [x] **#18** Proje iskeleti + MongoDB şemaları
  - package.json (express, mongoose, axios, zod) — Prisma YOK
  - src/models/Recipe.ts, src/models/SavedRecipe.ts
- [x] **#19** Tüm endpoint'ler
  - GET /recipes (sayfalı + filtreli: search, tags, minCalories, maxCalories, maxPrepTime)
  - GET /recipes/recommendations: User Service profil → filtre → random 10
  - GET /recipes/:id
  - POST /recipes/save/:id, GET /recipes/saved, DELETE /recipes/saved/:id
  - POST /recipes/:id/log: servings oranında makro → Nutrition Service /internal/log

---

## 🏃 Health Service (:3004) — PostgreSQL (health_db) / Prisma

- [~] **#20** Proje iskeleti + Prisma schema  ← yarım kaldı (package.json, tsconfig, Dockerfile, schema yazıldı; app.ts eksik)
  - package.json (express, prisma, axios, zod)
  - HealthData modeli (@@unique([userId, date, source]))
- [ ] **#21** Tüm endpoint'ler
  - POST /health/sync: upsert, steps→activityLevel → User Service PATCH /internal/profile/:userId
  - GET /health/today, GET /health/history?days=7
  - POST /health/manual

---

## 💳 Subscription Service (:3006) — PostgreSQL (subscription_db) / Prisma

- [ ] **#22** Proje iskeleti + Prisma schema + FEATURE_LIMITS
  - package.json (express, prisma, iyzipay, axios, zod)
  - Subscription, UsageLog, Plan, IyzicoWebhookLog modelleri
  - src/constants/featureLimits.js: FEATURE_LIMITS sabiti
- [ ] **#23** Plan + kullanım endpoint'leri
  - GET /plans (public)
  - GET /subscriptions/check (internal): allowed/used/limit/remaining
  - POST /subscriptions/increment (internal): count+1 upsert
  - GET /subscriptions/usage: tüm feature'lar özeti
  - GET /subscriptions/me: abonelik durumu + daysRemaining
- [ ] **#24** iyzico ödeme endpoint'leri
  - POST /checkout: plan bul, iyzico müşteri oluştur, form/token üret
  - POST /webhook: HMAC doğrula, log kaydet, event'e göre rol/status güncelle
  - POST /cancel: iyzico'da iptal, dönem sonuna kadar aktif
- [ ] **#25** Admin endpoint'leri
  - GET /admin/users (sayfalı + abonelik bilgisiyle)
  - PATCH /admin/users/:userId/role (manuel rol güncelle)
  - GET /admin/subscriptions/stats
  - GET /admin/webhooks

---

## 🚀 Railway Deployment

- [~] **#26** User Service Railway deploy
  - [x] Private networking URL'leri ayarlandı (outstanding-cat.railway.internal:8080)
  - [x] `notFoundHandler` eklendi (JSON 404 yanıtı)
  - [x] Auth controller'a hata loglama eklendi
  - [ ] Railway'de DATABASE_URL (PostgreSQL) set edilmeli
  - [ ] Railway'de JWT_SECRET, SMTP env var'ları set edilmeli
  - [ ] Prisma migrate deploy çalıştırılmalı
- [~] **#27** Nutrition Service Railway deploy
  - [x] Private networking URL'leri ayarlandı (romantic-rebirth.railway.internal:8080)
  - [ ] Railway'de DATABASE_URL (PostgreSQL) set edilmeli
  - [ ] Railway'de FOOD_MONGODB_URI set edilmeli
  - [ ] Prisma migrate deploy çalıştırılmalı (details kolonu için)
- [ ] **#28** API Gateway Railway deploy
  - [x] Trust proxy ayarı düzeltildi
  - [x] serviceUrl() helper eklendi (http:// prefix + trim)
  - [x] Servis URL'leri Railway internal adresleriyle güncellendi
  - [ ] Recipe, Health, AI, Subscription servisleri deploy edildiğinde URL'leri güncelle

---

## 📊 İlerleme

Tamamlanan: 20 / 25  (TypeScript dönüşümü dahil, #20 yarım)
Railway deploy: 2 / 6 servis deploy edildi (user, nutrition), DB env var'ları eksik
