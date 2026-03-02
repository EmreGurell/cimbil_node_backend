import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IIngredient {
  name:   string;
  amount: number;
  unit:   string;
}

export interface IInstruction {
  step:        number;
  description: string;
}

export interface IRecipe extends Document {
  _id:          Types.ObjectId;
  title:        string;
  description?: string;
  imageUrl?:    string;
  prepTime?:    number;
  cookTime?:    number;
  servings:     number;
  calories?:    number;
  protein?:     number;
  carbs?:       number;
  fat?:         number;
  fiber?:       number;
  tags:         string[];
  dietaryTags:  string[];
  ingredients:  IIngredient[];
  instructions: IInstruction[];
  source?:      string;
  createdAt:    Date;
  updatedAt:    Date;
}

const RecipeSchema = new Schema<IRecipe>(
  {
    title:        { type: String, required: true, index: true },
    description:  { type: String },
    imageUrl:     { type: String },
    prepTime:     { type: Number },
    cookTime:     { type: Number },
    servings:     { type: Number, default: 1 },
    calories:     { type: Number },
    protein:      { type: Number },
    carbs:        { type: Number },
    fat:          { type: Number },
    fiber:        { type: Number },
    tags:         { type: [String], default: [] },
    dietaryTags:  { type: [String], default: [], index: true },
    ingredients:  [
      {
        name:   { type: String, required: true },
        amount: { type: Number, required: true },
        unit:   { type: String, required: true },
      },
    ],
    instructions: [
      {
        step:        { type: Number, required: true },
        description: { type: String, required: true },
      },
    ],
    source: { type: String },
  },
  { timestamps: true },
);

RecipeSchema.index({ title: 'text', description: 'text' });

export const Recipe = mongoose.model<IRecipe>('Recipe', RecipeSchema);
