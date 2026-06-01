import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FreteGratisController } from './frete-gratis.controller';
import { FreteGratisService } from './frete-gratis.service';
import { FreteGratis } from '../database/entities/frete-gratis.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FreteGratis])],
  controllers: [FreteGratisController],
  providers: [FreteGratisService],
  exports: [FreteGratisService],
})
export class FreteGratisModule {}
