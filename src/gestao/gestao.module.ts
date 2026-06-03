import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GestaoController } from './gestao.controller';
import { TransportadorasService } from './transportadoras.service';
import { StatsService } from './stats.service';
import { CarrierAuthService } from './carrier-auth.service';
import { Transportadora } from '../database/entities/transportadora.entity';
import { TabelaFrete } from '../database/entities/tabela-frete.entity';
import { RegraComercial } from '../database/entities/regra-comercial.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transportadora, TabelaFrete, RegraComercial]),
  ],
  controllers: [GestaoController],
  providers: [TransportadorasService, StatsService, CarrierAuthService],
})
export class GestaoModule {}
