import { NextFunction, Request, Response } from 'express';

export function requestLogger(request: Request, response: Response, next: NextFunction) {
  const startedAt = Date.now();
  const requestId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  response.locals.requestId = requestId;
  console.log(`[api:start] ${requestId} ${request.method} ${request.originalUrl}`);

  response.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    console.log(`[api:done] ${requestId} ${request.method} ${request.originalUrl} ${response.statusCode} ${durationMs}ms`);
  });

  next();
}

