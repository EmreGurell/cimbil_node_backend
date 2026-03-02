# User Service — Test Rehberi

Base URL: `http://localhost:8080` (API Gateway)
Postman collection: `cimbil-user-service.postman_collection.json` → Import et

---

## ⚠️ Önemli: Email Kodu Nasıl Alınır?

`.env` dosyasında `SMTP_USER` ve `SMTP_PASS` boş olduğu için gerçek email gitmez.
Doğrulama kodunu iki yoldan alabilirsin:

**Yol 1 — Docker logs:**
```bash
docker logs cimbil-user-service-1 --tail 50
```
Kod log'a düşmez ama DB'den bakabilirsin.

**Yol 2 — Doğrudan DB'den (tavsiye edilen):**
```bash
docker exec -it cimbil-user-db-1 psql -U cimbil -d user_db -c \
  "SELECT code, type, \"expiresAt\", used FROM \"VerificationCode\" ORDER BY \"createdAt\" DESC LIMIT 5;"
```

---

## Test Akışı (sırayla yap)

### 1. Register
**POST** `/api/v1/auth/register`

```json
{
  "firstName": "Ahmet",
  "lastName": "Yılmaz",
  "email": "ahmet@test.com",
  "password": "test1234"
}
```

Beklenen: `201` — `{ success: true, data: { message: "...", userId: "uuid" } }`
→ Postman otomatik olarak `USER_ID` collection variable'ını set eder.

---

### 2. Verify Email
**POST** `/api/v1/auth/verify-email`

Önce kodu DB'den al (yukarıdaki komut), sonra:

```json
{
  "userId": "{{USER_ID}}",
  "code": "123456"
}
```

Beklenen: `200` — `{ success: true, data: { token: "...", user: {...} } }`
→ Postman otomatik olarak `TOKEN` variable'ını set eder.

---

### 3. Resend Code (opsiyonel)
**POST** `/api/v1/auth/resend-code`

```json
{
  "userId": "{{USER_ID}}"
}
```

Beklenen: `200` — eski kod iptal edilir, yeni kod üretilir.

---

### 4. Login
**POST** `/api/v1/auth/login`

```json
{
  "email": "ahmet@test.com",
  "password": "test1234"
}
```

Beklenen: `200` — `{ success: true, data: { token: "...", user: {...} } }`
→ Postman `TOKEN`'ı günceller.

**Hata senaryoları:**
- Yanlış şifre → `401 INVALID_CREDENTIALS`
- Email doğrulanmamış → `403 EMAIL_NOT_VERIFIED`
- Bulunamadı → `404 USER_NOT_FOUND`

---

### 5. Forgot Password
**POST** `/api/v1/auth/forgot-password`

```json
{
  "email": "ahmet@test.com"
}
```

Beklenen: `200` — aynı mesaj döner (email var/yok fark etmez, enumeration koruması)
→ Kodu DB'den al: `type = 'password_reset'`

---

### 6. Reset Password
**POST** `/api/v1/auth/reset-password`

```json
{
  "email": "ahmet@test.com",
  "code": "123456",
  "newPassword": "yeniSifre123"
}
```

Beklenen: `200`

---

### 7. Get Me
**GET** `/api/v1/users/me`
Header: `Authorization: Bearer {{TOKEN}}`

Beklenen: `200` — kullanıcı + profil + streak bilgisi

---

### 8. Create Profile
**POST** `/api/v1/users/profile`
Header: `Authorization: Bearer {{TOKEN}}`

```json
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
```

Beklenen: `201` — profil + `dailyCalorieGoal` (Mifflin-St Jeor ile hesaplanmış) + `dailyWaterGoal`

---

### 9. Update Profile
**PUT** `/api/v1/users/profile`
Header: `Authorization: Bearer {{TOKEN}}`

Partial update — sadece değiştirmek istediğin alanları gönder:

```json
{
  "weight": 73,
  "activityLevel": "active"
}
```

Beklenen: `200` — kalori/su hedefi yeniden hesaplanır.

---

### 10. Get Profile
**GET** `/api/v1/users/profile`
Header: `Authorization: Bearer {{TOKEN}}`

Beklenen: `200`

---

### 11. Save Chat Message
**POST** `/api/v1/users/chat-history`
Header: `Authorization: Bearer {{TOKEN}}`

```json
{
  "role": "user",
  "content": "Bugün ne yemeliyim?"
}
```

Sonra assistant mesajı da ekle:

```json
{
  "role": "assistant",
  "content": "Hedefine göre önerim: sabah yulaf, öğle ızgara tavuk."
}
```

---

### 12. Get Chat History
**GET** `/api/v1/users/chat-history?limit=20`
Header: `Authorization: Bearer {{TOKEN}}`

Cursor-based pagination için: `?limit=20&before=<messageId>`

---

### 13. Clear Chat History
**DELETE** `/api/v1/users/chat-history`
Header: `Authorization: Bearer {{TOKEN}}`

Beklenen: `200`

---

### 14. Streak Check
**POST** `/api/v1/users/streak/check`
Header: `Authorization: Bearer {{TOKEN}}`

Body: (boş)

Beklenen: `200` — `{ currentStreak, longestStreak, lastActiveDate }`
→ İkinci kez aynı günde çağırırsan streak değişmez.
→ Farklı bir günde çağırırsan streak artar.

---

### 15. Internal Endpoints (servisler arası)
Auth header gerekmez — internal network için tasarlandı.

**GET** `/internal/profile/{{USER_ID}}`
→ Diğer servislerin kullandığı profil bilgisi

**PATCH** `/internal/profile/{{USER_ID}}`
```json
{
  "activityLevel": "active"
}
```
→ Health Service bu endpoint'i çağırır; kalori hedefi yeniden hesaplanır.

---

### 16. Health Check
**GET** `/health`
→ `{ status: "ok", service: "user-service" }`

---

## Swagger UI
`http://localhost:3001/docs` — tüm endpoint'leri görsel olarak da test edebilirsin.

---

## DB'yi Doğrudan Sorgulamak

```bash
# Tüm kullanıcılar
docker exec -it cimbil-user-db-1 psql -U cimbil -d user_db -c 'SELECT id, email, "isVerified" FROM "User";'

# Verification kodları
docker exec -it cimbil-user-db-1 psql -U cimbil -d user_db -c 'SELECT code, type, "expiresAt", used FROM "VerificationCode" ORDER BY "createdAt" DESC LIMIT 5;'

# Profiller
docker exec -it cimbil-user-db-1 psql -U cimbil -d user_db -c 'SELECT "userId", "dailyCalorieGoal", "dailyWaterGoal", "activityLevel" FROM "Profile";'
```
