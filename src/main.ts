import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Headers de seguranca (item 7)
  app.use(helmet());

  // CORS restrito (item 3): so libera as origens listadas em CORS_ORIGINS
  // (separadas por virgula). Se nao configurar, libera geral (dev).
  const origens = process.env.CORS_ORIGINS;
  if (origens) {
    app.enableCors({
      origin: origens.split(',').map((o) => o.trim()),
      credentials: true,
    });
  } else {
    app.enableCors(); // desenvolvimento
  }

  // Validacao de entrada global (item 6): rejeita dados fora do formato
  // e remove campos nao esperados do corpo das requisicoes.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // remove campos nao declarados
      forbidNonWhitelisted: false, // nao quebra se vier campo extra (so ignora)
      transform: true, // converte tipos automaticamente
    }),
  );

  const porta = process.env.PORT || 3000;
  await app.listen(porta, '0.0.0.0');
  console.log(`API rodando na porta ${porta}`);
}
bootstrap();
