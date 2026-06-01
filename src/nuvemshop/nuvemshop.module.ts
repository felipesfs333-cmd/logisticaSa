import { Module } from '@nestjs/common';
import { NuvemshopController } from './nuvemshop.controller';
import { CotacaoModule } from '../cotacao/cotacao.module';

@Module({
  imports: [CotacaoModule],
  controllers: [NuvemshopController],
})
export class NuvemshopModule {}
