import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';

type AccessTokenPayload = {
  sub: string;
  organizationId: string;
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
};

declare global {
  namespace Express {
    interface Request {
      auth?: AccessTokenPayload;
    }
  }
}

export function requireAuth(request: Request, _response: Response, next: NextFunction) {
  const header = request.header('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    throw new HttpError(401, 'Missing bearer token');
  }

  try {
    request.auth = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
    next();
  } catch {
    throw new HttpError(401, 'Invalid or expired token');
  }
}

export function requireRole(...roles: AccessTokenPayload['role'][]) {
  return (request: Request, _response: Response, next: NextFunction) => {
    if (!request.auth || !roles.includes(request.auth.role)) {
      throw new HttpError(403, 'Insufficient permission');
    }

    next();
  };
}

