import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthLoginSchema, AuthRegisterSchema, USER_COLORS } from '@collabflow/shared';
import { IStorageService } from '../storage/IStorageService';
import { config } from '../config';

export function registerAuthRoutes(app: FastifyInstance, storage: IStorageService) {
  // Pre-seed demo user if not exists
  storage.findUserByEmail('demo@collabflow.dev').then(async (existing) => {
    if (!existing) {
      const hash = await bcrypt.hash('password123', 10);
      await storage.createUser({
        id: 'user-demo-123',
        email: 'demo@collabflow.dev',
        name: 'Alex Rivera (Demo)',
        avatarColor: USER_COLORS[5],
        passwordHash: hash,
      });
    }
  });

  // POST /api/auth/register
  app.post('/api/auth/register', async (req: FastifyRequest, reply: FastifyReply) => {
    const parseResult = AuthRegisterSchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parseResult.error.format(),
      });
    }

    const { email, password, name } = parseResult.data;
    const existing = await storage.findUserByEmail(email);
    if (existing) {
      return reply.status(409).send({ error: 'User with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const color = USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const user = await storage.createUser({
      id: userId,
      email,
      name,
      avatarColor: color,
      passwordHash,
    });

    const token = jwt.sign(
      { sub: user.id, email: user.email, name: user.name },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn as any }
    );

    return reply.status(201).send({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarColor: user.avatarColor,
      },
      token,
    });
  });

  // POST /api/auth/login
  app.post('/api/auth/login', async (req: FastifyRequest, reply: FastifyReply) => {
    const parseResult = AuthLoginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Invalid email or password format' });
    }

    const { email, password } = parseResult.data;
    const user = await storage.findUserByEmail(email);
    if (!user) {
      return reply.status(401).send({ error: 'Invalid email or password' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return reply.status(401).send({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email, name: user.name },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn as any }
    );

    return reply.send({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarColor: user.avatarColor,
      },
      token,
    });
  });

  // GET /api/auth/me
  app.get('/api/auth/me', async (req: FastifyRequest, reply: FastifyReply) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Missing authorization token' });
    }

    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as any;
      const user = await storage.findUserById(decoded.sub);
      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      return reply.send({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarColor: user.avatarColor,
        },
      });
    } catch {
      return reply.status(401).send({ error: 'Invalid or expired token' });
    }
  });
}
