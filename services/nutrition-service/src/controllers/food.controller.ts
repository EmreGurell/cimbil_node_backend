import { Request, Response, NextFunction } from 'express';
import * as foodService from '../services/food.service';
import { successResponse } from '../utils/response.helper';
import { AppError } from '../utils/app.error';

export async function getByBarcode(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { barcode } = req.params;
    if (!barcode || barcode.length < 4) {
      throw new AppError('Invalid barcode', 'VALIDATION_ERROR', 400);
    }

    const product = await foodService.lookupBarcode(barcode);
    successResponse(res, product);
  } catch (err) {
    next(err);
  }
}

export async function analyzeImage(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.file) {
      throw new AppError('Image file required', 'VALIDATION_ERROR', 400);
    }

    const result = await foodService.analyzeImage(req.file.buffer);
    successResponse(res, result);
  } catch (err) {
    next(err);
  }
}
