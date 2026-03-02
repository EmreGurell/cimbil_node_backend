"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectMongo = connectMongo;
const mongoose_1 = __importDefault(require("mongoose"));
async function connectMongo() {
    const uri = process.env.MONGODB_URI;
    if (!uri)
        throw new Error('MONGODB_URI is not defined');
    await mongoose_1.default.connect(uri);
    console.log('[NutritionService] MongoDB connected (food_db)');
}
//# sourceMappingURL=mongo.js.map