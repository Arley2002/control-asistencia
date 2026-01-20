import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { AppDataSource } from '../config/data-source';
import { Usuario } from '../entities/Usuario';
import { env } from '../config/env';

export const authRouter = Router();

const activeRefreshTokens = new Map<number, string>();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiados intentos, intente más tarde' }
});

authRouter.use('/login', loginLimiter);

const signTokens = (payload: { sub: number; rol: string }) => {
  const accessSecret: Secret = env.jwt.secret as Secret;
  const refreshSecret: Secret = env.jwt.refreshSecret as Secret;
  const accessExpires: SignOptions['expiresIn'] = env.jwt.expires as SignOptions['expiresIn'];
  const refreshExpires: SignOptions['expiresIn'] = env.jwt.refreshExpires as SignOptions['expiresIn'];
  const token = jwt.sign(payload, accessSecret, { expiresIn: accessExpires });
  const refresh = jwt.sign(payload, refreshSecret, { expiresIn: refreshExpires });
  activeRefreshTokens.set(payload.sub, refresh);
  return { token, refresh };
};

authRouter.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const repo = AppDataSource.getRepository(Usuario);
  const usuario = await repo.findOne({ where: [{ username }, { correo: username }], relations: ['rol'] });
  if (!usuario) return res.status(401).json({ message: 'Credenciales inválidas' });
  const ok = await bcrypt.compare(password, usuario.password_hash);
  if (!ok) return res.status(401).json({ message: 'Credenciales inválidas' });
  const payload = { sub: usuario.id, rol: usuario.rol.nombre };
  const { token, refresh } = signTokens(payload);
  res.json({ token, refresh, usuario: { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol.nombre } });
});

// Endpoint placeholder para refresh
authRouter.post('/refresh', (req, res) => {
  const { refresh } = req.body;
  if (!refresh) return res.status(400).json({ message: 'Refresh token requerido' });
  try {
    const payload = jwt.verify(refresh, env.jwt.refreshSecret as Secret) as any;
    const active = activeRefreshTokens.get(payload.sub);
    if (!active || active !== refresh) return res.status(401).json({ message: 'Refresh inválido o revocado' });
    const { token: newToken, refresh: newRefresh } = signTokens({ sub: payload.sub, rol: payload.rol });
    res.json({ token: newToken, refresh: newRefresh });
  } catch (err) {
    res.status(401).json({ message: 'Refresh inválido' });
  }
});

// Reset de contraseña deshabilitado
