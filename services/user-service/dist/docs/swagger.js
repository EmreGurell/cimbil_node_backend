"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSwagger = setupSwagger;
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const spec = {
    openapi: '3.0.0',
    info: {
        title: 'Cimbil — User Service',
        version: '1.0.0',
        description: 'Auth, profil, streak ve chat geçmişi yönetimi',
    },
    servers: [
        { url: 'http://localhost:3001', description: 'Local (direct)' },
        { url: 'http://localhost:8080', description: 'Local (gateway)' },
    ],
    components: {
        securitySchemes: {
            bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
        schemas: {
            Error: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string' },
                    code: { type: 'string' },
                },
            },
            User: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    email: { type: 'string', format: 'email' },
                    firstName: { type: 'string' },
                    lastName: { type: 'string' },
                    username: { type: 'string', nullable: true },
                },
            },
            Profile: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    userId: { type: 'string', format: 'uuid' },
                    age: { type: 'integer', nullable: true },
                    height: { type: 'number', description: 'cm', nullable: true },
                    weight: { type: 'number', description: 'kg', nullable: true },
                    targetWeight: { type: 'number', nullable: true },
                    gender: { type: 'string', enum: ['male', 'female', 'other'], nullable: true },
                    goal: { type: 'string', enum: ['lose_weight', 'gain_muscle', 'maintain', 'eat_healthy'], nullable: true },
                    activityLevel: { type: 'string', enum: ['sedentary', 'light', 'moderate', 'active', 'very_active'], nullable: true },
                    dietaryPreference: { type: 'string', enum: ['omnivore', 'vegetarian', 'vegan', 'pescatarian'], nullable: true },
                    allergies: { type: 'array', items: { type: 'string' } },
                    healthConditions: { type: 'array', items: { type: 'string' } },
                    dailyCalorieGoal: { type: 'integer', nullable: true },
                    dailyWaterGoal: { type: 'integer', description: 'ml', nullable: true },
                },
            },
            StreakData: {
                type: 'object',
                properties: {
                    currentStreak: { type: 'integer' },
                    longestStreak: { type: 'integer' },
                    lastActiveDate: { type: 'string', format: 'date-time', nullable: true },
                },
            },
        },
    },
    paths: {
        // ── AUTH ────────────────────────────────────────────────
        '/api/v1/auth/register': {
            post: {
                tags: ['Auth'],
                summary: 'Kayıt ol',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['firstName', 'lastName', 'email', 'password'],
                                properties: {
                                    firstName: { type: 'string', example: 'Ahmet' },
                                    lastName: { type: 'string', example: 'Yılmaz' },
                                    email: { type: 'string', format: 'email' },
                                    password: { type: 'string', minLength: 6 },
                                },
                            },
                        },
                    },
                },
                responses: {
                    201: {
                        description: 'Doğrulama emaili gönderildi',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                message: { type: 'string' },
                                                userId: { type: 'string', format: 'uuid' },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    409: { description: 'Email zaten kayıtlı' },
                },
            },
        },
        '/api/v1/auth/verify-email': {
            post: {
                tags: ['Auth'],
                summary: 'Email doğrula',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['userId', 'code'],
                                properties: {
                                    userId: { type: 'string', format: 'uuid' },
                                    code: { type: 'string', example: '123456' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: 'Doğrulandı, JWT döner',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                token: { type: 'string' },
                                                user: { $ref: '#/components/schemas/User' },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    400: { description: 'Geçersiz veya süresi dolmuş kod' },
                },
            },
        },
        '/api/v1/auth/resend-code': {
            post: {
                tags: ['Auth'],
                summary: 'Doğrulama kodunu yeniden gönder',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['userId'],
                                properties: { userId: { type: 'string', format: 'uuid' } },
                            },
                        },
                    },
                },
                responses: {
                    200: { description: 'Kod gönderildi' },
                    400: { description: 'Zaten doğrulanmış' },
                    404: { description: 'Kullanıcı bulunamadı' },
                },
            },
        },
        '/api/v1/auth/login': {
            post: {
                tags: ['Auth'],
                summary: 'Giriş yap',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['email', 'password'],
                                properties: {
                                    email: { type: 'string', format: 'email' },
                                    password: { type: 'string' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: 'Giriş başarılı',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                token: { type: 'string' },
                                                user: { $ref: '#/components/schemas/User' },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    401: { description: 'Hatalı şifre' },
                    403: { description: 'Email doğrulanmamış' },
                    404: { description: 'Kullanıcı bulunamadı' },
                },
            },
        },
        '/api/v1/auth/forgot-password': {
            post: {
                tags: ['Auth'],
                summary: 'Şifremi unuttum',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['email'],
                                properties: { email: { type: 'string', format: 'email' } },
                            },
                        },
                    },
                },
                responses: {
                    200: { description: 'Reset kodu gönderildi (email yoksa da aynı mesaj)' },
                },
            },
        },
        '/api/v1/auth/reset-password': {
            post: {
                tags: ['Auth'],
                summary: 'Şifre sıfırla',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['email', 'code', 'newPassword'],
                                properties: {
                                    email: { type: 'string', format: 'email' },
                                    code: { type: 'string', example: '123456' },
                                    newPassword: { type: 'string', minLength: 6 },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: { description: 'Şifre güncellendi' },
                    400: { description: 'Geçersiz kod' },
                },
            },
        },
        // ── KULLANICI & PROFİL ───────────────────────────────────
        '/api/v1/users/me': {
            get: {
                tags: ['Profil'],
                summary: 'Kendi bilgilerimi getir',
                security: [{ bearerAuth: [] }],
                responses: {
                    200: {
                        description: 'Kullanıcı + profil + streak',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                user: { $ref: '#/components/schemas/User' },
                                                profile: { $ref: '#/components/schemas/Profile' },
                                                streak: { $ref: '#/components/schemas/StreakData' },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    401: { description: 'Token gerekli' },
                },
            },
        },
        '/api/v1/users/profile': {
            post: {
                tags: ['Profil'],
                summary: 'Profil oluştur / güncelle',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    username: { type: 'string' },
                                    age: { type: 'integer' },
                                    height: { type: 'number', description: 'cm' },
                                    weight: { type: 'number', description: 'kg' },
                                    targetWeight: { type: 'number' },
                                    gender: { type: 'string', enum: ['male', 'female', 'other'] },
                                    goal: { type: 'string', enum: ['lose_weight', 'gain_muscle', 'maintain', 'eat_healthy'] },
                                    activityLevel: { type: 'string', enum: ['sedentary', 'light', 'moderate', 'active', 'very_active'] },
                                    dietaryPreference: { type: 'string', enum: ['omnivore', 'vegetarian', 'vegan', 'pescatarian'] },
                                    allergies: { type: 'array', items: { type: 'string' } },
                                    healthConditions: { type: 'array', items: { type: 'string' } },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: { description: 'Profil kaydedildi', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/Profile' } } } } } },
                    409: { description: 'Username zaten alınmış' },
                },
            },
            put: {
                tags: ['Profil'],
                summary: 'Profili kısmi güncelle',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    content: {
                        'application/json': {
                            schema: { type: 'object', description: 'POST ile aynı, tüm alanlar opsiyonel' },
                        },
                    },
                },
                responses: {
                    200: { description: 'Güncellendi' },
                    409: { description: 'Username zaten alınmış' },
                },
            },
            get: {
                tags: ['Profil'],
                summary: 'Profil bilgilerini getir',
                security: [{ bearerAuth: [] }],
                responses: {
                    200: { description: 'Profil', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/Profile' } } } } } },
                    404: { description: 'Profil henüz oluşturulmamış' },
                },
            },
        },
        // ── STREAK ───────────────────────────────────────────────
        '/api/v1/users/streak/check': {
            post: {
                tags: ['Streak'],
                summary: 'Streak kontrol et / güncelle',
                security: [{ bearerAuth: [] }],
                responses: {
                    200: {
                        description: 'Streak durumu',
                        content: {
                            'application/json': {
                                schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/StreakData' } } },
                            },
                        },
                    },
                },
            },
        },
        // ── CHAT GEÇMİŞİ ─────────────────────────────────────────
        '/api/v1/users/chat-history': {
            get: {
                tags: ['Chat'],
                summary: 'Chat geçmişini getir (sayfalı)',
                security: [{ bearerAuth: [] }],
                parameters: [
                    { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
                    { name: 'before', in: 'query', schema: { type: 'string', format: 'uuid' }, description: 'Sayfalama için mesaj ID' },
                ],
                responses: { 200: { description: 'Mesaj listesi' } },
            },
            post: {
                tags: ['Chat'],
                summary: 'Mesaj kaydet',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['role', 'content'],
                                properties: {
                                    role: { type: 'string', enum: ['user', 'assistant'] },
                                    content: { type: 'string' },
                                },
                            },
                        },
                    },
                },
                responses: { 201: { description: 'Mesaj kaydedildi' } },
            },
            delete: {
                tags: ['Chat'],
                summary: 'Tüm chat geçmişini sil',
                security: [{ bearerAuth: [] }],
                responses: { 200: { description: 'Silindi' } },
            },
        },
    },
};
function setupSwagger(app) {
    app.get('/api-docs.json', (_req, res) => res.json(spec));
    app.use('/docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(spec, {
        customSiteTitle: 'Cimbil User Service',
    }));
    console.log('[UserService] Swagger UI → http://localhost:3001/docs');
}
//# sourceMappingURL=swagger.js.map