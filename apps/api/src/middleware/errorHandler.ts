import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import { HttpError } from '../utils/httpError.js';

export function errorHandler(error: unknown, request: Request, response: Response, _next: NextFunction) {
  const requestId = response.locals.requestId ?? 'no-request-id';

  if (error instanceof ZodError) {
    console.error(`[api:error] ${requestId} ${request.method} ${request.originalUrl} 400 validation`, error.flatten());
    return response.status(400).json({
      message: 'Validation failed',
      issues: error.flatten()
    });
  }

  if (error instanceof HttpError) {
    console.error(`[api:error] ${requestId} ${request.method} ${request.originalUrl} ${error.statusCode} ${error.message}`);
    return response.status(error.statusCode).json({ message: error.message });
  }

  const message = error instanceof Error ? error.message : 'Internal server error';
  console.error(`[api:error] ${requestId} ${request.method} ${request.originalUrl} 500`, error);
  return response.status(500).json({
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : message
  });
}
