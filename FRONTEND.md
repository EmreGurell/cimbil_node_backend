# Cimbil — Flutter Entegrasyon Rehberi

Base URL: `http://<SERVER_IP>:8080` (API Gateway)
Dev: `http://10.0.2.2:8080` (Android emulator) | `http://localhost:8080` (iOS sim)

---

## Genel Kurallar

### Auth
- Token süresiz JWT. Her protected istekte header ekle:
  ```
  Authorization: Bearer <token>
  ```
- Token'ı `flutter_secure_storage` ile sakla.
- 401 gelirse → token geçersiz → login ekranına yönlendir.

### Response Formatı
```json
// Başarı
{ "success": true, "data": { ... } }

// Hata
{ "success": false, "message": "...", "code": "ERROR_CODE" }
```

### HTTP Status Kodları
| Status | Anlamı |
|--------|--------|
| 200 | OK |
| 201 | Oluşturuldu |
| 400 | Validation hatası |
| 401 | Token yok / geçersiz |
| 403 | Yetki yok (email doğrulanmamış, plan limiti vb.) |
| 404 | Bulunamadı |
| 409 | Çakışma (email/username zaten kayıtlı) |
| 500 | Sunucu hatası |

---

## 🔐 Auth Akışı

### 1. Kayıt
```
POST /api/v1/auth/register
```
```json
// Request
{ "firstName": "Ahmet", "lastName": "Yılmaz", "email": "ahmet@test.com", "password": "test1234" }

// Response 201
{ "success": true, "data": { "message": "Verification email sent", "userId": "uuid" } }
```
→ `userId`'yi sakla. Email doğrulama ekranına geç.

**Hata kodları:**
- `EMAIL_EXISTS` (409) → "Bu email zaten kayıtlı"

---

### 2. Email Doğrulama
```
POST /api/v1/auth/verify-email
```
```json
// Request
{ "userId": "uuid", "code": "123456" }

// Response 200
{
  "success": true,
  "data": {
    "token": "eyJ...",
    "user": { "id": "uuid", "email": "...", "firstName": "Ahmet", "lastName": "Yılmaz" }
  }
}
```
→ `token` ve `user`'ı sakla. Ana ekrana geç.

**Hata kodları:**
- `INVALID_CODE` (400) → "Kod geçersiz veya süresi dolmuş"

---

### 3. Kodu Yeniden Gönder
```
POST /api/v1/auth/resend-code
```
```json
{ "userId": "uuid" }
```

**Hata kodları:**
- `ALREADY_VERIFIED` (400) → Email zaten doğrulanmış

---

### 4. Giriş
```
POST /api/v1/auth/login
```
```json
// Request
{ "email": "ahmet@test.com", "password": "test1234" }

// Response 200
{
  "success": true,
  "data": {
    "token": "eyJ...",
    "user": { "id": "uuid", "email": "...", "firstName": "Ahmet", "lastName": "Yılmaz", "username": null }
  }
}
```

**Hata kodları:**
- `USER_NOT_FOUND` (404)
- `EMAIL_NOT_VERIFIED` (403) → Doğrulama ekranına yönlendir
- `INVALID_CREDENTIALS` (401)

---

### 5. Şifremi Unuttum
```
POST /api/v1/auth/forgot-password
```
```json
{ "email": "ahmet@test.com" }
// Response her zaman 200 döner (güvenlik)
```

---

### 6. Şifre Sıfırla
```
POST /api/v1/auth/reset-password
```
```json
{ "email": "ahmet@test.com", "code": "123456", "newPassword": "yeniSifre123" }
```

---

## 👤 Kullanıcı & Profil

### Beni Getir
```
GET /api/v1/users/me
Authorization: Bearer <token>
```
```json
// Response 200
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "ahmet@test.com",
    "firstName": "Ahmet",
    "lastName": "Yılmaz",
    "username": "ahmetyilmaz",
    "isVerified": true,
    "profile": {
      "age": 28, "height": 178, "weight": 75,
      "targetWeight": 70, "gender": "male",
      "goal": "lose_weight", "activityLevel": "moderate",
      "dietaryPreference": "omnivore",
      "allergies": ["gluten"], "healthConditions": [],
      "dailyCalorieGoal": 2100, "dailyWaterGoal": 2625
    },
    "streakData": { "currentStreak": 3, "longestStreak": 7, "lastActiveDate": "..." }
  }
}
```
→ Uygulama açılışında çağır. `profile === null` ise profil kurulum ekranına yönlendir.

---

### Profil Oluştur (ilk kurulum)
```
POST /api/v1/users/profile
Authorization: Bearer <token>
```
```json
// Request — tüm alanlar
{
  "username": "ahmetyilmaz",
  "age": 28,
  "height": 178,
  "weight": 75,
  "targetWeight": 70,
  "gender": "male",
  "goal": "lose_weight",
  "activityLevel": "moderate",
  "dietaryPreference": "omnivore",
  "allergies": ["gluten"],
  "healthConditions": []
}

// Response 200 — dailyCalorieGoal ve dailyWaterGoal otomatik hesaplanır
{ "success": true, "data": { "dailyCalorieGoal": 2100, "dailyWaterGoal": 2625, ... } }
```

**Enum değerleri:**
- `gender`: `male` | `female` | `other`
- `goal`: `lose_weight` | `gain_muscle` | `maintain` | `eat_healthy`
- `activityLevel`: `sedentary` | `light` | `moderate` | `active` | `very_active`
- `dietaryPreference`: `omnivore` | `vegetarian` | `vegan` | `pescatarian`

**Hata kodları:**
- `USERNAME_TAKEN` (409)

---

### Profil Güncelle (kısmi)
```
PUT /api/v1/users/profile
Authorization: Bearer <token>
```
```json
// Sadece değiştirilen alanları gönder
{ "weight": 73, "activityLevel": "active" }
```
→ `dailyCalorieGoal` ve `dailyWaterGoal` otomatik yeniden hesaplanır.

---

### Profil Getir
```
GET /api/v1/users/profile
Authorization: Bearer <token>
```

---

## 💬 Chat Geçmişi

### Geçmişi Getir (sayfalı)
```
GET /api/v1/users/chat-history?limit=20
GET /api/v1/users/chat-history?limit=20&before=<messageId>   ← daha eskisini getir
Authorization: Bearer <token>
```
```json
// Response
{
  "success": true,
  "data": {
    "messages": [
      { "id": "uuid", "role": "user", "content": "Bugün ne yemeliyim?", "createdAt": "..." },
      { "id": "uuid", "role": "assistant", "content": "Önerim...", "createdAt": "..." }
    ],
    "hasMore": true,
    "nextCursor": "uuid"   // bir sonraki sayfa için before parametresi
  }
}
```
→ Sohbet ekranı açılırken ilk 20 mesajı getir. Yukarı scroll'da `before=nextCursor` ile önceki mesajları yükle.

---

### Mesaj Kaydet
```
POST /api/v1/users/chat-history
Authorization: Bearer <token>
```
```json
{ "role": "user", "content": "Bugün ne yemeliyim?" }
// veya
{ "role": "assistant", "content": "Önerim: ..." }
```
→ Kullanıcı mesaj gönderince ve AI yanıt gelince her ikisini de kaydet.

---

### Geçmişi Temizle
```
DELETE /api/v1/users/chat-history
Authorization: Bearer <token>
```

---

## 🔥 Streak

```
POST /api/v1/users/streak/check
Authorization: Bearer <token>
```
```json
// Response
{ "success": true, "data": { "currentStreak": 3, "longestStreak": 7, "lastActiveDate": "..." } }
```
→ Uygulama her açıldığında veya kullanıcı bir şey logladığında çağır. (Nutrition log ekleme bunu otomatik tetikler.)

---

## 🥗 Nutrition

### Günlük Log Getir
```
GET /api/v1/nutrition/get-by-date?date=2026-03-02
Authorization: Bearer <token>
```
```json
// Response
{
  "success": true,
  "data": {
    "date": "2026-03-02",
    "dailyGoal": 2100,
    "totals": { "calories": 630, "protein": 47, "carbs": 85, "fat": 17, "fiber": 5 },
    "entries": [
      {
        "id": "uuid",
        "foodName": "Yulaf Ezmesi",
        "calories": 350, "protein": 12, "carbs": 55, "fat": 7, "fiber": 5,
        "mealType": "breakfast",
        "source": "manual",
        "loggedAt": "..."
      }
    ]
  }
}
```
→ Ana ekranın besin özeti kartı için kullan. `date` parametresi `YYYY-MM-DD` formatında.

---

### Log Ekle
```
POST /api/v1/nutrition/log
Authorization: Bearer <token>
```
```json
{
  "foodName": "Yulaf Ezmesi",
  "calories": 350,
  "protein": 12,
  "carbs": 55,
  "fat": 7,
  "fiber": 5,
  "mealType": "breakfast",
  "date": "2026-03-02",
  "source": "manual"
}
```

**`mealType` değerleri:** `breakfast` | `lunch` | `dinner` | `snack`
**`source` değerleri:** `manual` | `barcode` | `photo` | `recipe`

---

### Log Sil
```
DELETE /api/v1/nutrition/log/:id
Authorization: Bearer <token>
```

---

### Geçmiş (grafik için)
```
GET /api/v1/nutrition/history?startDate=2026-02-24&endDate=2026-03-02
Authorization: Bearer <token>
```
```json
// Response — günlük özetler dizisi
{
  "success": true,
  "data": [
    { "date": "2026-03-01", "totalCalories": 1850, "totalProtein": 95, "totalCarbs": 210, "totalFat": 62, "totalFiber": 18 },
    { "date": "2026-03-02", "totalCalories": 630, ... }
  ]
}
```
→ Haftalık/aylık grafik ekranı için kullan.

---

## 🔍 Yemek Arama

### Barkod ile Ara
```
GET /api/v1/food/barcode/:barcode
Authorization: Bearer <token>
```
```json
// Response
{
  "success": true,
  "data": {
    "name": "Nutella",
    "brand": "Ferrero",
    "calories": 539,
    "protein": 6.3,
    "carbs": 57.5,
    "fat": 30.9,
    "fiber": 0,
    "servingSize": "15g"
  }
}
```
→ Barkod tarama sonrası bu endpoint'i çağır. Bulunan ürünü log ekleme formuna doldur.

**Hata kodları:**
- `NOT_FOUND` (404) → "Ürün bulunamadı, manuel giriş yap"

---

### Fotoğraf ile Analiz
```
POST /api/v1/food/analyze-image
Authorization: Bearer <token>
Content-Type: multipart/form-data
```
```
body: form-data
  image: <file>   ← max 10MB
```
```json
// Response
{
  "success": true,
  "data": { "foodName": "Mercimek Çorbası", "calories": 180, "protein": 9, "carbs": 22, "fat": 5, "fiber": 4 }
}
```
→ AI servisine iletilir. ⚠️ Subscription planı gerektirir (`food_analysis` feature).

---

## 📖 Tarifler

> ⚠️ Tarif endpoint'leri `recipes` feature'ı ile kısıtlıdır. Free plan erişemez.

### Tarif Listesi
```
GET /api/v1/recipes?page=1&limit=20
GET /api/v1/recipes?search=mercimek&tags=vegan&minCalories=200&maxCalories=600&maxPrepTime=30
Authorization: Bearer <token>
```
```json
{
  "success": true,
  "data": {
    "recipes": [ { "id": "...", "title": "...", "calories": 350, "prepTime": 20, "dietaryTags": ["vegan"], ... } ],
    "total": 142,
    "page": 1,
    "totalPages": 8
  }
}
```

---

### Tarif Detay
```
GET /api/v1/recipes/:id
Authorization: Bearer <token>
```

---

### Önerilen Tarifler
```
GET /api/v1/recipes/recommendations
Authorization: Bearer <token>
```
→ Kullanıcının profil tercihlerine göre 10 tarif önerir.

---

### Tarif Kaydet / Kaydedilenleri Getir / Kaldır
```
POST   /api/v1/recipes/save/:id        ← tarifi kaydet
GET    /api/v1/recipes/saved           ← kayıtlı tarifleri listele
DELETE /api/v1/recipes/saved/:savedId  ← kayıtlıdan kaldır
Authorization: Bearer <token>
```

---

### Tarifi Nutrition Log'a Ekle
```
POST /api/v1/recipes/:id/log
Authorization: Bearer <token>
```
```json
{ "mealType": "lunch", "date": "2026-03-02", "servings": 2 }
// Response 201
{ "success": true, "data": { "message": "Added to nutrition log" } }
```
→ Porsiyon oranında makrolar hesaplanır, nutrition log'a eklenir.

---

## 🏃 Health (Sağlık Verisi)

### Senkronize Et (Google Fit / Apple Health / Samsung Health)
```
POST /api/v1/health/sync
Authorization: Bearer <token>
```
```json
{
  "source": "google_fit",
  "data": {
    "steps": 8500,
    "heartRate": 72,
    "sleepHours": 7.5,
    "caloriesBurned": 420,
    "date": "2026-03-02"
  }
}
```
→ `steps` değerine göre `activityLevel` otomatik güncellenir ve kalori hedefi yeniden hesaplanır.

**`source` değerleri:** `google_fit` | `apple_health` | `samsung_health`
⚠️ `health_sync` feature'ı gerektirir.

---

### Bugünün Verisi
```
GET /api/v1/health/today
Authorization: Bearer <token>
```

---

### Geçmiş
```
GET /api/v1/health/history?days=7
Authorization: Bearer <token>
```

---

### Manuel Giriş
```
POST /api/v1/health/manual
Authorization: Bearer <token>
```
```json
{ "steps": 6000, "heartRate": 75, "sleepHours": 8, "caloriesBurned": 300, "date": "2026-03-02" }
```

---

## 💬 AI Chat (Cimbil)

```
POST /api/v1/cimbil/chat
Authorization: Bearer <token>
```
```json
// Request
{ "message": "Bugün ne yemeliyim?" }

// Response
{ "success": true, "data": { "reply": "Hedefine göre önerim: ..." } }
```
→ AI servisi kullanıcının profilini ve son chat geçmişini otomatik kullanır.
⚠️ `ai_chat` feature'ı gerektirir. Free plan erişemez.

---

## 💳 Abonelik

### Plan Listesi (public — token gerekmez)
```
GET /api/v1/subscriptions/plans
```
```json
{
  "success": true,
  "data": {
    "plans": [
      { "planType": "pro_monthly", "role": "pro", "priceTotal": 99.90, "priceMonthly": 99.90, "billingPeriod": "monthly", "discountPercent": 0 },
      { "planType": "pro_yearly",  "role": "pro", "priceTotal": 899.90, "priceMonthly": 74.99, "billingPeriod": "yearly", "discountPercent": 25 }
    ]
  }
}
```

---

### Mevcut Abonelik
```
GET /api/v1/subscriptions/me
Authorization: Bearer <token>
```
```json
{ "success": true, "data": { "role": "pro", "planType": "pro_monthly", "status": "active", "currentPeriodEnd": "...", "daysRemaining": 23 } }
```

---

### Kullanım Özeti
```
GET /api/v1/subscriptions/usage
Authorization: Bearer <token>
```
```json
{
  "success": true,
  "data": {
    "role": "pro",
    "usage": {
      "food_analysis": { "used": 2, "limit": 5, "remaining": 3 },
      "ai_chat":       { "used": 8, "limit": 20, "remaining": 12 },
      "recipes":       { "used": 1, "limit": 10, "remaining": 9 },
      "barcode_scan":  { "used": 3, "limit": -1, "remaining": -1 },
      "health_sync":   { "used": 1, "limit": -1, "remaining": -1 }
    }
  }
}
```
→ `limit: -1` = sınırsız. Profil ekranında kullanım göstergesi için kullan.

---

### Satın Alma (iyzico checkout)
```
POST /api/v1/subscriptions/checkout
Authorization: Bearer <token>
```
```json
{ "planType": "pro_monthly" }

// Response
{ "success": true, "data": { "checkoutFormContent": "...", "token": "...", "paymentPageUrl": "..." } }
```
→ `paymentPageUrl`'i WebView'da aç veya `checkoutFormContent`'i HTML olarak render et.

---

### İptal
```
POST /api/v1/subscriptions/cancel
Authorization: Bearer <token>
```
→ Dönem sonuna kadar aktif kalır.

---

## ⚠️ Plan Limiti Aşıldığında

Gateway, limit aşıldığında şu cevabı döner:
```json
{
  "success": false,
  "code": "LIMIT_REACHED",
  "message": "Günlük limitinize ulaştınız",
  "upgrade": true,
  "used": 5,
  "limit": 5
}
```
→ `upgrade: true` gelirse abonelik yükseltme ekranını göster.

---

## 🗺️ Ekran → Endpoint Haritası

| Ekran | Endpoint'ler |
|-------|-------------|
| Splash | `GET /users/me` |
| Kayıt | `POST /auth/register` |
| Email Doğrulama | `POST /auth/verify-email`, `POST /auth/resend-code` |
| Giriş | `POST /auth/login` |
| Şifre Sıfırlama | `POST /auth/forgot-password`, `POST /auth/reset-password` |
| Profil Kurulum | `POST /users/profile` |
| Ana Ekran | `GET /nutrition/get-by-date`, `GET /users/me` |
| Yemek Ekle (manuel) | `POST /nutrition/log` |
| Yemek Ekle (barkod) | `GET /food/barcode/:barcode`, `POST /nutrition/log` |
| Yemek Ekle (fotoğraf) | `POST /food/analyze-image`, `POST /nutrition/log` |
| Grafik / Geçmiş | `GET /nutrition/history` |
| Tarifler | `GET /recipes`, `GET /recipes/recommendations` |
| Tarif Detay | `GET /recipes/:id`, `POST /recipes/save/:id`, `POST /recipes/:id/log` |
| Chat (Cimbil) | `POST /cimbil/chat`, `GET /users/chat-history`, `POST /users/chat-history` |
| Sağlık | `POST /health/sync`, `GET /health/today`, `GET /health/history` |
| Profil Düzenle | `PUT /users/profile`, `GET /users/profile` |
| Abonelik | `GET /subscriptions/plans`, `GET /subscriptions/me`, `GET /subscriptions/usage` |
| Satın Al | `POST /subscriptions/checkout` |
