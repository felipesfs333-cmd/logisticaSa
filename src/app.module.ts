import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transportadora } from './database/entities/transportadora.entity';
import { TabelaFrete } from './database/entities/tabela-frete.entity';
import { RegraComercial } from './database/entities/regra-comercial.entity';
import { FreteGratis } from './database/entities/frete-gratis.entity';
import { Usuario } from './database/entities/usuario.entity';
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
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        // Se houver DATABASE_URL (Railway injeta automaticamente), usa ela.
        // Senao, usa as variaveis separadas (desenvolvimento local).
        const url = config.get('DATABASE_URL');
        const base: any = {
          type: 'postgres',
          entities: [
            Transportadora,
            TabelaFrete,
            RegraComercial,
            FreteGratis,
            Usuario,
          ],
          synchronize: true,
        };
        if (url) {
          return {
            ...base,
            url,
            // Railway exige SSL nas conexoes externas
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
})
export class AppModule {}
