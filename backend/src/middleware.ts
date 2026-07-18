import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend Express Request interface to include user payload
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development_only';

export const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1]; // Format: "Bearer <token>"

    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ error: 'Brak dostępu. Token wygasł lub jest nieprawidłowy.' });
      }

      req.user = user;
      next();
    });
  } else {
    res.status(401).json({ error: 'Nieautoryzowany dostęp. Brak tokenu Bearer.' });
  }
};
