import mongoose from 'mongoose';

export async function connectMongo(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not defined');

  await mongoose.connect(uri);
  console.log('[NutritionService] MongoDB connected (food_db)');
}
