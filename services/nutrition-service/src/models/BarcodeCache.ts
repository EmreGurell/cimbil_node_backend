import mongoose, { Document, Schema } from 'mongoose';

export interface IBarcode extends Document {
  barcode:     string;
  name:        string;
  brand?:      string;
  calories:    number;
  protein:     number;
  carbs:       number;
  fat:         number;
  fiber:       number;
  servingSize: string;
}

const BarcodeCacheSchema = new Schema<IBarcode>(
  {
    barcode:     { type: String, required: true, unique: true, index: true },
    name:        { type: String, required: true },
    brand:       { type: String },
    calories:    { type: Number, required: true },
    protein:     { type: Number, required: true },
    carbs:       { type: Number, required: true },
    fat:         { type: Number, required: true },
    fiber:       { type: Number, default: 0 },
    servingSize: { type: String, required: true },
  },
  { timestamps: true },
);

export const BarcodeCache = mongoose.model<IBarcode>('BarcodeCache', BarcodeCacheSchema);
