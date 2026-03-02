import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ISavedRecipe extends Document {
  _id:      Types.ObjectId;
  userId:   string;
  recipeId: Types.ObjectId;
  savedAt:  Date;
}

const SavedRecipeSchema = new Schema<ISavedRecipe>(
  {
    userId:   { type: String,           required: true },
    recipeId: { type: Schema.Types.ObjectId, required: true, ref: 'Recipe' },
    savedAt:  { type: Date,             default: Date.now },
  },
  { timestamps: false },
);

// Prevent duplicate saves
SavedRecipeSchema.index({ userId: 1, recipeId: 1 }, { unique: true });

export const SavedRecipe = mongoose.model<ISavedRecipe>('SavedRecipe', SavedRecipeSchema);
