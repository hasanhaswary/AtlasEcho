import jwt from 'jsonwebtoken';
import { prisma } from '../prismaClient.js';

const JWT_SECRET = process.env.JWT_SECRET || 'atlasecho_secret_key_2026';

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (token && token !== 'null' && token !== 'undefined') {
        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
          if (user) {
            req.user = user;
            return next();
          }
        } catch (err) {
          // Token invalid, fall through to x-user-id check
        }
      }
    }

    const demoUserId = req.headers['x-user-id'];
    if (demoUserId) {
      const user = await prisma.user.findUnique({ where: { id: demoUserId } });
      if (user) {
        req.user = user;
        return next();
      }
    }

    return res.status(401).json({ error: 'Authentication token required' });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const optionalAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (token && token !== 'null' && token !== 'undefined') {
        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
          if (user) {
            req.user = user;
          }
        } catch (tokenErr) {
          // Token error, skip to x-user-id fallback below
        }
      }
    }
    
    if (!req.user && req.headers['x-user-id']) {
      const user = await prisma.user.findUnique({ where: { id: req.headers['x-user-id'] } });
      if (user) req.user = user;
    }
  } catch (err) {
    // ignore token errors for optional auth
  }
  next();
};

export { JWT_SECRET };

