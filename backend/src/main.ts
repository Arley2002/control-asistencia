import 'reflect-metadata';
import { createApp } from './app';
import { env } from './config/env';
import { AppDataSource } from './config/data-source';

async function bootstrap() {
  try {
    await AppDataSource.initialize();
    const app = createApp();
    app.listen(env.port, () => {
      console.log(`API escuchando en puerto ${env.port}`);
    });
  } catch (error) {
    console.error('Error iniciando la aplicación', error);
    process.exit(1);
  }
}

bootstrap();
