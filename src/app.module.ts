import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { Transportadora } from './database/entities/transportadora.entity';
import { TabelaFrete } from './database/entities/tabela-frete.entity';
import { RegraComercial } from './database/entities/regra-comercial.entity';
import { FreteGratis } from './database/entities/frete-gratis.entity';
import { Usuario } from './database/entities/usuario.entity';
import { LojaNuvemshop } from './database/entities/loja-nuvemshop.entity';
import { AppController } from './app.controller';
import { ImportadorModule } from './importador/importador.module';
import { CotacaoModule } from './cotacao/cotacao.module';
import { GestaoModule } from './gestao/gestao.module';
import { FreteGratisModule } from './frete-gratis/frete-gratis.module';
import { NuvemshopModule } from './nuvemshop/nuvemshop.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Rate limiting (item 4): no maximo 60 requisicoes por minuto por IP.
    // Protege contra forca bruta no login e abuso geral.
    ThrottlerModule.forRoot([
      { ttl: 60000, limit: 60 },
    ]),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get('DATABASE_URL');
        // synchronize (item 5): por padrao DESLIGADO (seguro em producao).
        // Ligue so em desenvolvimento com DB_SYNC=true.
        const sync = config.get('DB_SYNC') === 'true';
        const base: any = {
          type: 'postgres',
          entities: [
            Transportadora,
            TabelaFrete,
            RegraComercial,
            FreteGratis,
            Usuario,
            LojaNuvemshop,
          ],
          synchronize: sync,
        };
        if (url) {
          return {
            ...base,
            url,
            ssl: { rejectUnauthorized: false },
          };
        }
        return {
          ...base,
          host: config.get('DB_HOST'),
          port: +config.get('DB_PORT'),
          username: config.get('DB_USER'),
          password: config.get('DB_PASSWORD'),
          database: config.get('DB_NAME'),
        };
      },
    }),
    ImportadorModule,
    CotacaoModule,
    GestaoModule,
    FreteGratisModule,
    NuvemshopModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    // Aplica o rate limiting globalmente
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
