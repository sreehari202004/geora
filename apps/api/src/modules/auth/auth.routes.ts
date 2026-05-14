import bcrypt from 'bcryptjs';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

import { env } from '../../config/env.js';
import { prisma } from '../../prisma/client.js';
import { HttpError } from '../../utils/httpError.js';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const registerSchema = z.object({
  organizationName: z.string().min(2),
  industry: z.string().optional(),
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(8)
});

function signAccessToken(user: { id: string; organizationId: string; role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE' }) {
  return jwt.sign(
    {
      organizationId: user.organizationId,
      role: user.role
    },
    env.JWT_ACCESS_SECRET,
    {
      expiresIn: '12h',
      subject: user.id
    }
  );
}

function signRefreshToken(userId: string) {
  return jwt.sign({}, env.JWT_REFRESH_SECRET, {
    expiresIn: '30d',
    subject: userId
  });
}

authRouter.post('/register', async (request, response, next) => {
  try {
    const input = registerSchema.parse(request.body);
    const passwordHash = await bcrypt.hash(input.password, 12);

    const organization = await prisma.organization.create({
      data: {
        name: input.organizationName,
        industry: input.industry,
        users: {
          create: {
            name: input.name,
            email: input.email.toLowerCase(),
            phone: input.phone,
            passwordHash,
            role: 'ADMIN'
          }
        }
      },
      include: {
        users: true
      }
    });

    const user = organization.users[0];

    response.status(201).json({
      accessToken: signAccessToken(user),
      refreshToken: signRefreshToken(user.id),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/login', async (request, response, next) => {
  try {
    const input = loginSchema.parse(request.body);
    const user = await prisma.user.findUnique({
      where: {
        email: input.email.toLowerCase()
      }
    });

    if (!user) {
      throw new HttpError(401, 'Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(input.password, user.passwordHash);

    if (!isValidPassword) {
      throw new HttpError(401, 'Invalid credentials');
    }

    response.json({
      accessToken: signAccessToken(user),
      refreshToken: signRefreshToken(user.id),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/refresh', async (request, response, next) => {
  try {
    const input = z
      .object({
        refreshToken: z.string().min(1)
      })
      .parse(request.body);
    const payload = jwt.verify(input.refreshToken, env.JWT_REFRESH_SECRET);
    const userId = typeof payload === 'object' && payload.sub ? String(payload.sub) : null;

    if (!userId) {
      throw new HttpError(401, 'Invalid refresh token');
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userId
      }
    });

    if (!user) {
      throw new HttpError(401, 'Invalid refresh token');
    }

    response.json({
      accessToken: signAccessToken(user),
      refreshToken: signRefreshToken(user.id),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
});
