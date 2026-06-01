import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors(); // permite que o frontend acesse a API depois
  const porta = process.env.PORT || 3000;
  await app.listen(porta, '0.0.0.0');
  console.log(`API rodando na porta ${porta}`);
}
bootstrap();
