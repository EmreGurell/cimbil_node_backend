import mongoose from 'mongoose';

export async function connectMongo(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI env var not set');

  await mongoose.connect(uri);
  console.log('[RecipeService] MongoDB connected');
}
