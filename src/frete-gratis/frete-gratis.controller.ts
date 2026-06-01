import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { FreteGratisService } from './frete-gratis.service';
import { FreteGratis } from '../database/entities/frete-gratis.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('frete-gratis')
@UseGuards(JwtAuthGuard)
export class FreteGratisController {
  constructor(private readonly service: FreteGratisService) {}

  // GET /frete-gratis
  @Get()
  listar() {
    return this.service.listar();
  }

  // POST /frete-gratis
  // body: { transportadora_id, cep_inicio, cep_fim, valor_minimo, data_inicio, data_fim }
  @Post()
  criar(@Body() body: Partial<FreteGratis>) {
    return this.service.criar(body);
  }

  // DELETE /frete-gratis/2
  @Delete(':id')
  remover(@Param('id') id: string) {
    return this.service.remover(Number(id));
  }
}
