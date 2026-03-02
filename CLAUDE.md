# CLAUDE.md

Sen deneyimli bir Node.js mikroservis mimarısın. Aşağıda detayları verilen
Flutter sağlık/beslenme uygulaması "Cimbil" için mikroservis tabanlı backend
yazacağız. Her servis bağımsız çalışır, kendi DB'sine sahiptir.

## Genel Mimari

                    ┌─────────────────┐
                    │   API Gateway   │  :8080
                    └────────┬────────┘
                             │
        ┌──────────┬──────────┼──────────┬──────────┐
        │          │          │          │          │
┌────▼───┐ ┌────▼───┐ ┌───▼────┐ ┌───▼────┐ ┌───▼────┐
│  User  │ │Nutritn │ │Recipe  │ │Health  │ │  AI    │
│Service │ │Service │ │Service │ │Service │ │Service │
│ :3001  │ │ :3002  │ │ :3003  │ │ :3004  │ │ :3005  │
└────────┘ └────────┘ └────────┘ └────────┘ └────────┘

## Tech Stack
- Runtime: Node.js 20+
- Language: TypeScript 5+ (strict mode, tüm servisler)
- Framework: Express.js
- ORM/ODM:
  - Prisma + PostgreSQL → User, Nutrition (log), Health, Subscription servisleri
  - Mongoose + MongoDB  → Nutrition (food cache), Recipe servisleri
- Auth: JWT (jsonwebtoken) — süresiz token (mobil uygulama)
- Email: Nodemailer (doğrulama + şifre sıfırlama)
- Inter-service iletişim: HTTP/axios
- File Upload: Multer (fotoğraf base64 olarak AI'a iletilir)
- Docker + docker-compose (multi-stage build)
- Validation: Zod
- Build: tsc → dist/ | Dev: tsx watch

## TypeScript Kuralları
- Her servis kendi tsconfig.json'una sahip
- strict: true
- Dockerfile: builder stage (tsc) + runner stage (node dist/)
- Ortak tipler src/types/ altında tanımlanır

## Port Yapısı
Gateway :8080
├── User Service      :3001  (auth, profil, streak, chat history)
├── Nutrition Service :3002  (log, barkod, fotoğraf analizi)
├── Recipe Service    :3003  (tarifler, kaydet, log'a ekle)
├── Health Service    :3004  (Google Fit, Apple Health, Samsung Health)
├── AI Service        :3005  (HAZIR)
└── Subscription Svc  :3006  (iyzico, roller, günlük limitler, admin)

## Veritabanı Mimarisi

PostgreSQL (user_db)         → User Service
PostgreSQL (nutrition_db)    → Nutrition Service (NutritionLog)
PostgreSQL (subscription_db) → Subscription Service
PostgreSQL (health_db)       → Health Service

MongoDB (food_db)            → Nutrition Service
  collections:
    ├── barcode_cache        → Open Food Facts cache
    └── (ileride custom foods eklenebilir)

MongoDB (recipe_db)          → Recipe Service
  collections:
    ├── recipes              → Tarif veritabanı
    └── saved_recipes        → Kullanıcı kayıtları

## Ortak Klasör Yapısı (her servis)

service-name/
├── src/
│   ├── app.js
│   ├── controllers/
│   ├── routes/
│   ├── services/
│   ├── middleware/
│   └── utils/
│       ├── response.helper.js
│       └── error.handler.js
├── prisma/schema.prisma   ← sadece PostgreSQL kullanan servisler
└── package.json

Not: Recipe Service ve Nutrition Service'in food kısmı MongoDB/Mongoose kullanır,
bu servislerde prisma/ yerine src/models/ altında Mongoose şemaları bulunur.

## Response Formatı (tüm servisler tutarlı olsun)
Başarı: { success: true, data: { ... } }
Hata:   { success: false, message: "...", code: "ERROR_CODE" }

HTTP Status Kodları:
200 OK | 201 Created | 400 Bad Request | 401 Unauthorized
403 Forbidden | 404 Not Found | 409 Conflict | 500 Server Error

## ================================
## SERVİS 1: USER SERVICE (:3001)
## ================================

### Prisma Schema

model User {
id            String    @id @default(uuid())
username      String    @unique        // form'dan alınır
email         String    @unique
password      String
firstName     String
lastName      String
isVerified    Boolean   @default(false)
createdAt     DateTime  @default(now())
profile       Profile?
streakData    StreakData?
chatHistory   ChatMessage[]
verificationCodes VerificationCode[]
passwordResets    PasswordReset[]
}

model VerificationCode {
id        String   @id @default(uuid())
userId    String
code      String                        // 6 haneli random
type      String                        // email_verify | password_reset
expiresAt DateTime                      // +15 dakika
used      Boolean  @default(false)
user      User     @relation(fields: [userId], references: [id])
}

model Profile {
id                 String   @id @default(uuid())
userId             String   @unique
age                Int?
height             Float?               // cm
weight             Float?               // kg
targetWeight       Float?               // kg
gender             String?              // male | female | other
goal               String?              // lose_weight | gain_muscle | maintain | eat_healthy
activityLevel      String?              // sedentary | light | moderate | active | very_active
dietaryPreference  String?              // omnivore | vegetarian | vegan | pescatarian
allergies          String[]             // custom yazılabilir
healthConditions   String[]             // custom yazılabilir
dailyCalorieGoal   Int?                 // Mifflin-St Jeor
dailyWaterGoal     Int?                 // weight * 35 ml
user               User     @relation(fields: [userId], references: [id])
}

model StreakData {
id              String   @id @default(uuid())
userId          String   @unique
currentStreak   Int      @default(0)
longestStreak   Int      @default(0)
lastActiveDate  DateTime?
user            User     @relation(fields: [userId], references: [id])
}

model ChatMessage {
id        String   @id @default(uuid())
userId    String
role      String                        // user | assistant
content   String
createdAt DateTime @default(now())
user      User     @relation(fields: [userId], references: [id])
}

### Endpoint'ler

// --- AUTH AKIŞI ---

POST /api/v1/users/register
Body: { firstName, lastName, email, password }
İş akışı:
1. Email unique mi kontrol et → 409 değilse
2. bcrypt ile şifreyi hashle
3. User oluştur (isVerified: false)
4. 6 haneli kod üret → VerificationCode'a kaydet (type: email_verify, 15dk TTL)
5. Nodemailer ile email gönder
   Response: { success: true, message: "Verification email sent", userId }

POST /api/v1/users/verify-email
Body: { userId, code }
İş akışı:
1. Kod geçerli mi? (used: false, expiresAt > now, type: email_verify)
2. User.isVerified = true
3. Kodu used: true yap
4. Süresiz JWT token üret → token'a { userId, email } göm
   Response: { success: true, token, user: { id, email, firstName, lastName } }

POST /api/v1/users/resend-code
Body: { userId }
→ Eski kodları iptal et, yeni kod üret, email gönder

POST /api/v1/users/login
Body: { email, password }
İş akışı:
1. Kullanıcıyı bul → 404 değilse
2. isVerified kontrolü → 403 "Email not verified" değilse
3. bcrypt.compare → 401 değilse
4. Süresiz JWT üret
   Response: { success: true, token, user }

POST /api/v1/users/forgot-password
Body: { email }
→ 6 haneli kod üret (type: password_reset, 15dk), email gönder
Response: { success: true, message: "Reset code sent" }

POST /api/v1/users/reset-password
Body: { email, code, newPassword }
→ Kodu doğrula, şifreyi güncelle, kodu kullanıldı işaretle
Response: { success: true, message: "Password updated" }

// --- KULLANICI & PROFİL ---

GET /api/v1/users/me                              [AUTH]
→ Profil + streak dahil tam kullanıcı bilgisi

POST /api/v1/users/profile                        [AUTH]
Body: {
username, age, height, weight, targetWeight,
gender, goal, activityLevel, dietaryPreference,
allergies, healthConditions
}
İş akışı:
1. Username unique mi kontrol et → 409 değilse
2. Mifflin-St Jeor ile dailyCalorieGoal hesapla:
   Erkek: (10×weight)+(6.25×height)-(5×age)+5
   Kadın: (10×weight)+(6.25×height)-(5×age)-161
   Sonucu aktivite çarpanıyla çarp:
   sedentary: ×1.2 | light: ×1.375 | moderate: ×1.55
   active: ×1.725 | very_active: ×1.9
3. dailyWaterGoal = weight × 35 (ml)
4. Profile + StreakData upsert
   Response: { success: true, data: profile }

PUT /api/v1/users/profile                         [AUTH]
→ Partial update, kalori/su hedefi yeniden hesapla

GET /api/v1/users/profile                         [AUTH]
→ Profil bilgilerini döner

// --- CHAT GEÇMİŞİ ---

GET /api/v1/users/chat-history                    [AUTH]
Query: ?limit=50&before=messageId
→ Sayfalı chat geçmişi

POST /api/v1/users/chat-history                   [AUTH]
Body: { role, content }
→ Mesajı kaydet (AI Service'ten gelen yanıt da buraya)

DELETE /api/v1/users/chat-history                 [AUTH]
→ Tüm geçmişi sil

// --- STREAK ---

POST /api/v1/users/streak/check                   [AUTH]
İş akışı:
1. lastActiveDate === bugün mü? → zaten güncellendi, pas geç
2. lastActiveDate === dün mü? → currentStreak++
3. Değilse → currentStreak = 1
4. longestStreak güncelle
5. Kaydet
   Response: { currentStreak, longestStreak, lastActiveDate }

## =====================================
## SERVİS 2: NUTRITION SERVICE (:3002)
## =====================================

### Veritabanları

**PostgreSQL (nutrition_db) — Prisma**

model NutritionLog {
id        String   @id @default(uuid())
userId    String
foodName  String
calories  Float
protein   Float
carbs     Float
fat       Float
fiber     Float    @default(0)
mealType  String   // breakfast | lunch | dinner | snack
source    String   // manual | barcode | photo | recipe
date      DateTime
loggedAt  DateTime @default(now())
}

**MongoDB (food_db) — Mongoose**

// barcode_cache collection (src/models/BarcodeCache.js)
{
  barcode:     String  (unique, indexed),
  name:        String,
  brand:       String,
  calories:    Number,
  protein:     Number,
  carbs:       Number,
  fat:         Number,
  fiber:       Number,
  servingSize: String,
  createdAt:   Date    (default: now)
}

### Endpoint'ler

GET  /api/v1/nutrition/get-by-date?date=YYYY-MM-DD  [AUTH]
İş akışı:
1. O güne ait tüm logları getir
2. User Service'ten /internal/profile/:userId ile dailyCalorieGoal çek
3. Toplamları hesapla
   Response: {
   date, dailyGoal,
   totals: { calories, protein, carbs, fat, fiber },
   entries: [{ id, foodName, calories, protein, carbs,
   fat, fiber, mealType, source, loggedAt }]
   }

POST /api/v1/nutrition/log                          [AUTH]
Body: { foodName, calories, protein, carbs,
fat, fiber, mealType, date, source }
→ Log oluştur, streak check endpoint'ini tetikle
Response: { success: true, data: entry }

DELETE /api/v1/nutrition/log/:id                    [AUTH]
→ Sadece kendi logu silebilir (userId kontrolü)

GET  /api/v1/nutrition/history                      [AUTH]
Query: ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
→ Tarih aralığı günlük özeti (grafik için)
Response: [{ date, totalCalories, totalProtein, totalCarbs, totalFat }]

GET  /api/v1/food/barcode/:barcode                  [AUTH]
İş akışı:
1. FoodProduct tablosunda ara (önce cache)
2. Yoksa Open Food Facts:
   GET https://world.openfoodfacts.org/api/v0/product/{barcode}.json
3. Bulursa DB'ye kaydet, döndür
4. Bulamazsa 404
   Response: { productName, brand, calories, protein,
   carbs, fat, fiber, servingSize }

POST /api/v1/food/analyze-image                     [AUTH]
Body: multipart/form-data { image }
İş akışı:
1. Multer ile görseli al
2. Buffer'ı base64'e çevir
3. AI Service'e (:3005) POST /analyze-image ile ilet
4. Sonucu döndür
   Response: { foodName, calories, protein, carbs, fat, fiber }

## ====================================
## SERVİS 3: RECIPE SERVICE (:3003)
## ====================================

### Veritabanı

**MongoDB (recipe_db) — Mongoose**

// recipes collection (src/models/Recipe.js)
{
  _id:          ObjectId,
  title:        String  (required),
  description:  String,
  imageUrl:     String,
  prepTime:     Number,             // dakika
  cookTime:     Number,             // dakika
  servings:     Number  (default: 1),
  calories:     Number,
  protein:      Number,
  carbs:        Number,
  fat:          Number,
  fiber:        Number,
  tags:         [String],
  dietaryTags:  [String],           // vegan | vegetarian | gluten-free | high-protein vb.
  ingredients:  [{ name, amount, unit }],
  instructions: [{ step, description }],
  source:       String,
  createdAt:    Date    (default: now)
}

// saved_recipes collection (src/models/SavedRecipe.js)
{
  _id:      ObjectId,
  userId:   String  (indexed),
  recipeId: ObjectId (ref: Recipe),
  savedAt:  Date    (default: now),
  // compound unique index: { userId, recipeId }
}

### Endpoint'ler

GET /api/v1/recipes                               [AUTH]
Query: ?page=1&limit=20&search=mercimek
&tags=vegan&minCalories=200&maxCalories=600
&maxPrepTime=30
Response: { recipes: [...], total, page, totalPages }

GET /api/v1/recipes/:id                           [AUTH]
→ Tarif detayı

GET /api/v1/recipes/recommendations               [AUTH]
İş akışı:
1. User Service'ten /internal/profile/:userId çek
   (dietaryPreference, allergies, goal)
2. Buna göre filtrele + random 10 tarif öner
   Response: { recipes: [...] }

POST /api/v1/recipes/save/:id                     [AUTH]
→ Kaydet (@@unique sayesinde duplicate yok)

GET /api/v1/recipes/saved                         [AUTH]
→ Kaydedilen tarifler

DELETE /api/v1/recipes/saved/:id                  [AUTH]
→ Kaydedilenden çıkar

POST /api/v1/recipes/:id/log                      [AUTH]
Body: { mealType, date, servings }
İş akışı:
1. Tarifi bul
2. servings oranında makroları hesapla
3. Nutrition Service'e POST /internal/log ile gönder
   Response: { success: true, message: "Added to nutrition log" }

## =====================================
## SERVİS 4: HEALTH SERVICE (:3004)
## =====================================

### Prisma Schema

model HealthData {
id           String   @id @default(uuid())
userId       String
date         DateTime
steps        Int?
heartRate    Int?     // bpm ortalama
sleepHours   Float?
caloriesBurned Int?
source       String   // google_fit | apple_health | samsung_health | manual
syncedAt     DateTime @default(now())
@@unique([userId, date, source])
}

### Endpoint'ler

POST /api/v1/health/sync                          [AUTH]
Body: {
source: "google_fit" | "apple_health" | "samsung_health",
data: { steps, heartRate, sleepHours, caloriesBurned, date }
}
İş akışı:
1. HealthData upsert (@@unique üzerinden)
2. steps > 10000 ise → activityLevel = "active"
   steps > 7500   ise → "moderate"
   steps < 3000   ise → "sedentary"
   → User Service PATCH /internal/profile/:userId { activityLevel }
   → Kalori hedefi yeniden hesaplanır (User Service halleder)
   Response: { success: true, data: healthData }

GET /api/v1/health/today                          [AUTH]
→ Bugünün sağlık verisi (tüm source'lardan en güncel)

GET /api/v1/health/history                        [AUTH]
Query: ?days=7
→ Son N günün günlük özeti

POST /api/v1/health/manual                        [AUTH]
Body: { steps, heartRate, sleepHours, caloriesBurned, date }
→ Entegrasyon yoksa manuel giriş

## ========================
## AI SERVICE (:3005)
## ========================
HAZIR — dokunma.
Diğer servisler şu endpoint'leri kullanır:
POST /analyze-image  → base64 image gönderilir
POST /chat           → { message, userProfile, history } gönderilir
## ==========================================
## SERVİS 5: SUBSCRIPTION SERVICE (:3006)
## ==========================================

### Roller & Planlar

ROLLER:
free      → Kayıt olan herkes
pro       → Aylık veya yıllık Pro satın almış
premium   → Aylık veya yıllık Premium satın almış
admin     → Manuel atanan yönetici (sen)

PLAN TİPLERİ:
free
pro_monthly
pro_yearly      → %X indirim (fiyatı .env'den al)
premium_monthly
premium_yearly  → %X indirim

### Özellik Limitleri (FEATURE_LIMITS sabiti)

const FEATURE_LIMITS = {
food_analysis: {        // Fotoğrafla yemek analizi
free:    { daily: 1 },
pro:     { daily: 5 },
premium: { daily: -1 },  // -1 = sınırsız
admin:   { daily: -1 }
},
ai_chat: {              // Cimbil chatbot
free:    { daily: 0 },   // 0 = erişim yok
pro:     { daily: 20 },
premium: { daily: -1 },
admin:   { daily: -1 }
},
recipes: {              // Tarif sistemi
free:    { daily: 0 },   // erişim yok
pro:     { daily: 10 },
premium: { daily: -1 },
admin:   { daily: -1 }
},
barcode_scan: {         // Barkod tarama
free:    { daily: 5 },
pro:     { daily: -1 },
premium: { daily: -1 },
admin:   { daily: -1 }
},
health_sync: {          // Health Service entegrasyonu
free:    { daily: 1 },
pro:     { daily: -1 },
premium: { daily: -1 },
admin:   { daily: -1 }
}
}

Not: Limitler ileride değiştirilebilir, sabit olarak
constants dosyasında tut.

### Prisma Schema

model Subscription {
id               String    @id @default(uuid())
userId           String    @unique
role             String    @default("free")  // free|pro|premium|admin
planType         String    @default("free")  // free|pro_monthly|pro_yearly|...
status           String    @default("active")// active|cancelled|expired|past_due
currentPeriodStart DateTime?
currentPeriodEnd   DateTime?
iyzicoSubsRef    String?   // iyzico abonelik referans kodu
iyzicoCustomerId String?   // iyzico müşteri ID
createdAt        DateTime  @default(now())
updatedAt        DateTime  @updatedAt
usageLogs        UsageLog[]
}

model UsageLog {
id             String   @id @default(uuid())
userId         String
feature        String   // food_analysis | ai_chat | recipes | barcode_scan | health_sync
date           DateTime // sadece gün bazında (YYYY-MM-DD)
count          Int      @default(0)
subscription   Subscription @relation(fields: [userId], references: [userId])
@@unique([userId, feature, date])
}

model Plan {
id             String  @id @default(uuid())
name           String  // "Pro Aylık", "Premium Yıllık" vb.
planType       String  @unique // pro_monthly | pro_yearly | premium_monthly | premium_yearly
role           String  // pro | premium
priceMonthly   Float   // Gösterim için aylık karşılığı
priceTotal     Float   // Gerçek ödeme tutarı
currency       String  @default("TRY")
billingPeriod  String  // monthly | yearly
discountPercent Int    @default(0) // yıllık alımlarda indirim %
isActive       Boolean @default(true)
iyziReferenceCode String? // iyzico plan referansı
createdAt      DateTime @default(now())
}

model IyzicoWebhookLog {
id        String   @id @default(uuid())
payload   Json
event     String   // subscription.activated | subscription.cancelled vb.
processed Boolean  @default(false)
createdAt DateTime @default(now())
}

### Endpoint'ler

// --- PLANLAR ---

GET /api/v1/subscriptions/plans               [PUBLIC]
→ Aktif tüm planları döner (fiyat, indirim, özellikler)
Response: {
plans: [
{
planType: "pro_monthly",
role: "pro",
priceTotal: 99.90,
priceMonthly: 99.90,
billingPeriod: "monthly",
discountPercent: 0
},
{
planType: "pro_yearly",
role: "pro",
priceTotal: 899.90,
priceMonthly: 74.99,   // priceTotal/12
billingPeriod: "yearly",
discountPercent: 25
},
...
]
}

// --- SATIN ALMA ---

POST /api/v1/subscriptions/checkout           [AUTH]
Body: { planType }
İş akışı:
1. Planı bul
2. İyzico'da müşteri oluştur (yoksa)
3. İyzico Subscription API ile ödeme formu/token oluştur
4. Client'a iyzico checkout formunu döndür
   Response: { checkoutFormContent, token, paymentPageUrl }

POST /api/v1/subscriptions/webhook            [PUBLIC - iyzico secret ile doğrula]
Body: iyzico webhook payload
İş akışı:
1. iyzico HMAC imzasını doğrula
2. IyzicoWebhookLog'a kaydet
3. Event tipine göre işlem:
   "subscription.activated"  → role güncelle, currentPeriodEnd set et
   "subscription.cancelled"  → status: cancelled, dönem sonuna kadar aktif
   "subscription.upgraded"   → yeni role güncelle
   "payment.success"         → currentPeriodEnd uzat
   "payment.failed"          → status: past_due
4. processed: true yap
   Response: 200 OK (iyzico beklediği için hızlı dönülmeli)

POST /api/v1/subscriptions/cancel             [AUTH]
→ İyzico'da aboneliği iptal et (dönem sonuna kadar aktif kalır)
Response: { message: "Subscription will end on {date}" }

// --- KULLANIM KONTROLÜ (Gateway'in kullandığı) ---

GET /api/v1/subscriptions/check               [INTERNAL]
Query: ?userId=xxx&feature=food_analysis
İş akışı:
1. Kullanıcının role'ünü al
2. FEATURE_LIMITS'ten günlük limiti bul
3. UsageLog'dan bugünkü count'u al
4. allowed: count < limit || limit === -1
   Response: {
   allowed: true | false,
   role: "free",
   used: 2,
   limit: 5,
   remaining: 3
   }

POST /api/v1/subscriptions/increment          [INTERNAL]
Body: { userId, feature }
→ UsageLog'da o günün count'unu +1 artır (upsert)
Response: { success: true }

GET /api/v1/subscriptions/usage               [AUTH]
→ Kullanıcının tüm özellikler için bugünkü kullanım özeti
Response: {
role: "pro",
usage: {
food_analysis:  { used: 2, limit: 5,  remaining: 3  },
ai_chat:        { used: 8, limit: 20, remaining: 12 },
recipes:        { used: 1, limit: 10, remaining: 9  },
barcode_scan:   { used: 0, limit: -1, remaining: -1 },
health_sync:    { used: 1, limit: -1, remaining: -1 }
}
}

GET /api/v1/subscriptions/me                  [AUTH]
→ Kullanıcının mevcut abonelik durumu
Response: {
role, planType, status,
currentPeriodEnd,
daysRemaining: 23
}

// --- ADMİN ---

GET  /api/v1/admin/users                      [ADMIN]
→ Tüm kullanıcılar + abonelik bilgileri (sayfalı)

PATCH /api/v1/admin/users/:userId/role        [ADMIN]
Body: { role: "admin" | "pro" | "premium" | "free" }
→ Rolü manuel güncelle (ödeme olmadan)

GET  /api/v1/admin/subscriptions/stats        [ADMIN]
→ Plan bazlı abone sayıları, toplam gelir özeti

GET  /api/v1/admin/webhooks                   [ADMIN]
→ Son webhook logları

## ==========================================
## GATEWAY'E EKLENECEKLEr
## ==========================================

### Yeni Route Eşleşmesi
/api/v1/subscriptions/** → subscription-service:3006
/api/v1/admin/**         → subscription-service:3006

### Subscription Middleware (Gateway'e ekle)

KORUNAN FEATURE ROUTE'LARI:
POST /api/v1/food/analyze-image    → feature: food_analysis
POST /api/v1/cimbil/chat           → feature: ai_chat
GET  /api/v1/recipes/**            → feature: recipes
GET  /api/v1/food/barcode/**       → feature: barcode_scan
POST /api/v1/health/sync           → feature: health_sync

Her korunan route için middleware akışı:
1. GET subscription-service:3006/api/v1/subscriptions/check
   ?userId={userId}&feature={feature}
2. allowed: false → 403 {
   success: false,
   code: "LIMIT_REACHED",
   message: "Günlük limitinize ulaştınız",
   upgrade: true,
   used: 5, limit: 5
   }
3. allowed: true → isteği servise ilet
4. Servis 200 döndürdükten sonra:
   POST subscription-service:3006/api/v1/subscriptions/increment
   Body: { userId, feature }

### Admin Middleware (Gateway'e ekle)
/api/v1/admin/** route'larında:
1. JWT doğrula
2. role === "admin" değilse → 403 "Admin access required"

## ==========================================
## DOCKER COMPOSE EKİ
## ==========================================

subscription-service:
build: ./services/subscription-service
ports: ["3006:3006"]
environment:
DATABASE_URL: postgresql://...subscription_db...
IYZICO_API_KEY: ${IYZICO_API_KEY}
IYZICO_SECRET_KEY: ${IYZICO_SECRET_KEY}
IYZICO_BASE_URL: https://sandbox.iyzipay.com  # prod: https://api.iyzipay.com
depends_on:
- subscription-db

subscription-db:
image: postgres:15
environment:
POSTGRES_DB: subscription_db
...

## .env.example EKLERİ
IYZICO_API_KEY=
IYZICO_SECRET_KEY=
IYZICO_BASE_URL=https://sandbox.iyzipay.com
IYZICO_WEBHOOK_SECRET=

PRO_MONTHLY_PRICE=99.90
PRO_YEARLY_PRICE=899.90
PRO_YEARLY_DISCOUNT=25

PREMIUM_MONTHLY_PRICE=199.90
PREMIUM_YEARLY_PRICE=1799.90
PREMIUM_YEARLY_DISCOUNT=25

## ÖNEMLİ NOTLAR
- İyzico sandbox ile başla, prod anahtarları .env'de ayrı tut
- Webhook endpoint'i iyzico panelinden kayıt edilmeli
- Abonelik iptal edilse bile currentPeriodEnd'e kadar rol aktif kalır
- Admin rolü sadece PATCH /admin/users/:userId/role ile atanır
- UsageLog her gün gece yarısı sıfırlanmaz, date bazlı unique
  kayıt olduğu için otomatik sıfırlanır (yeni gün = yeni kayıt)
- FEATURE_LIMITS değiştirilmek istenirse sadece constants
  dosyasını güncelle, DB'ye dokunma gerekmez
## ================================
## API GATEWAY KURALLARI (:8080)
## ================================

PUBLIC (JWT gerekmez):
POST /api/v1/users/register
POST /api/v1/users/verify-email
POST /api/v1/users/resend-code
POST /api/v1/users/login
POST /api/v1/users/forgot-password
POST /api/v1/users/reset-password

PROTECTED (JWT zorunlu):
Diğer tüm route'lar
→ Token doğrulandıktan sonra x-user-id header'ı ile servise ilet

Rate Limiting:
/login, /register, /forgot-password → 10 istek/dakika
Diğerleri → 100 istek/dakika

Route → Servis Eşleşmesi:
/api/v1/users/**     → user-service:3001
/api/v1/auth/**      → user-service:3001
/api/v1/nutrition/** → nutrition-service:3002
/api/v1/food/**      → nutrition-service:3002
/api/v1/recipes/**   → recipe-service:3003
/api/v1/health/**    → health-service:3004
/api/v1/cimbil/**    → ai-service:3005

Internal Route'lar (Gateway bypass — servisler arası):
Prefix: /internal/**
→ JWT doğrulaması yok, sadece internal network'ten erişilebilir
Örnekler:
GET  user-service:3001/internal/profile/:userId
PATCH user-service:3001/internal/profile/:userId
POST nutrition-service:3002/internal/log

## DOCKER COMPOSE
- PostgreSQL container'lar: user_db, nutrition_db, subscription_db, health_db
- MongoDB container'lar: food_db (Nutrition Service), recipe_db (Recipe Service)
- Servisler arası internal Docker network
- .env'den DB URL'leri, MONGO_URI'lar, JWT_SECRET, NODEMAILER config
- Health check'ler
- Volume persistence

## ÖNEMLİ NOTLAR
- AI Service tamamen hazır, hiçbir dosyasına dokunma
- Nutrition log eklendiğinde User Service'teki streak/check tetiklenmeli
- Health sync sonrası activityLevel değişirse User Service kalori hedefini
  otomatik yeniden hesaplar
- Chat geçmişi User Service'te tutulur, AI Service'e her istekte
  son 10 mesaj + userProfile gönderilir

## İLK GÖREVİN

1. Önce projenin tamamı için detaylı bir TODO listesi oluştur.
   Her madde tek, küçük ve tamamlanabilir bir iş olsun.
   Servis bazında grupla.

2. TODO sırasıyla ilerle:
   ① docker-compose.yml + .env.example
   ② API Gateway
   ③ User Service (register → verify → login → forgot-password → profile → chat-history → streak)
   ④ Nutrition Service
   ⑤ Recipe Service
   ⑥ Health Service

3. Her adım tamamlandığında "✅ [adım adı] tamamlandı" yaz.
4. Sadece kritik mimari karar noktalarında dur ve sor.
5. Diğer her şeyi onay beklemeden tamamla.