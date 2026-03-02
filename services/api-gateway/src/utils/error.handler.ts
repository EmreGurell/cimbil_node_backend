import { Request, Response } from 'express';
import { IncomingMessage, ServerResponse } from 'http';

export function proxyErrorHandler(
  err: Error,
  req: IncomingMessage,
  res: ServerResponse,
): void {
  console.error(
    `[Gateway] Proxy error → ${req.method} ${req.url}:`,
    err.message,
  );

  if (!res.headersSent) {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        success: false,
        message: 'Service unavailable',
        code: 'SERVICE_UNAVAILABLE',
      }),
    );
  }
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.path}`,
    code: 'NOT_FOUND',
  });
}
