import { Response } from 'express';

export function successResponse<T>(res: Response, data: T, status = 200): void {
  res.status(status).json({ success: true, data });
}

export function createdResponse<T>(res: Response, data: T): void {
  res.status(201).json({ success: true, data });
}

export function errorResponse(
  res: Response,
  message: string,
  code: string,
  status = 400,
): void {
  res.status(status).json({ success: false, message, code });
}
