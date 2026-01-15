import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

type JwtPayload = {
  sub: number;
  rol: string;
};

export function requiereAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ message: 'Token requerido' });
  const token = header.replace('Bearer ', '');
  try {
    const payload = jwt.verify(token, env.jwt.secret) as JwtPayload;
    (req as any).user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token inválido' });
  }
}

export function requiereRol(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as JwtPayload | undefined;
    if (!user) return res.status(401).json({ message: 'No autenticado' });
    if (!roles.includes(user.rol)) return res.status(403).json({ message: 'No autorizado' });
    next();
  };
}
