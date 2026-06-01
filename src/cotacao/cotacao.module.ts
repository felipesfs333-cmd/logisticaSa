import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CotacaoController } from './cotacao.controller';
import { CotacaoService } from './cotacao.service';
import { RegrasController } from './regras.controller';
import { RegrasService } from './regras.service';
import { TabelaFrete } from '../database/entities/tabela-frete.entity';
import { Transportadora } from '../database/entities/transportadora.entity';
import { RegraComercial } from '../database/entities/regra-comercial.entity';
import { FreteGratisModule } from '../frete-gratis/frete-gratis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TabelaFrete, Transportadora, RegraComercial]),
    FreteGratisModule,
  ],
  controllers: [CotacaoController, RegrasController],
  providers: [CotacaoService, RegrasService],
  exports: [CotacaoService],
})
export class CotacaoModule {}
