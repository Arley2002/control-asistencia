import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: Number(process.env.PORT) || 3000,
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    pass: process.env.DB_PASS || '1234',
    name: process.env.DB_NAME || 'asoinca_control'
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'cambia_este_valor',
    expires: process.env.JWT_EXPIRES || '15m',
    refreshSecret: process.env.REFRESH_SECRET || 'cambia_este_refresh',
    refreshExpires: process.env.REFRESH_EXPIRES || '7d'
  }
};
