const { MonoticketsApplication } = require('./application');
const { RedisService } = require('./services/redis-service');

async function bootstrap() {
  const app = new MonoticketsApplication({ redisService: new RedisService() });
  app.setGlobalPrefix('api/v1');
  await app.init();
  const port = Number(process.env.PORT) || 3000;
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`Monotickets API corriendo en http://0.0.0.0:${port}/api/v1`);
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Error al iniciar la aplicación', error);
  process.exit(1);
});
