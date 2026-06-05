import { Module } from '@nestjs/common';
import { NuvemshopController } from './nuvemshop.controller';
import { CotacaoModule } from '../cotacao/cotacao.module';
import { DiasUteisService } from './dias-uteis.service';

@Module({
  imports: [CotacaoModule],
  controllers: [NuvemshopController],
  providers: [DiasUteisService],
})
export class NuvemshopModule {}
