import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImportadorController } from './importador.controller';
import { ImportadorService } from './importador.service';
import { TabelaFrete } from '../database/entities/tabela-frete.entity';
import { Transportadora } from '../database/entities/transportadora.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TabelaFrete, Transportadora])],
  controllers: [ImportadorController],
  providers: [ImportadorService],
})
export class ImportadorModule {}
