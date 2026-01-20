import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { router } from './routes/index';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 600,
    standardHeaders: true,
    legacyHeaders: false
  });

  app.use(helmet());
  app.use(cors());
  app.use(compression());
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan('dev'));
  app.use(apiLimiter);

  app.use('/api', router);

  app.use((req, res) => {
    res.status(404).json({ message: 'No encontrado' });
  });

  return app;
}
