import { Controller, Get, Put, Param, Body, UseGuards } from '@nestjs/common';
import { RegrasService } from './regras.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('transportadoras')
@UseGuards(JwtAuthGuard)
export class RegrasController {
  constructor(private readonly regrasService: RegrasService) {}

  // Lista as regras por estado de uma transportadora (sempre as 27 UFs)
  // GET /transportadoras/1/regras
  @Get(':id/regras')
  listar(@Param('id') id: string) {
    return this.regrasService.porTransportadora(Number(id));
  }

  // Salva a regra de um estado especifico
  // PUT /transportadoras/1/regras/MG
  // body: { "markup":12, "dias_extras":2, "frete_minimo":19.90, "ativo_no_estado":true }
  @Put(':id/regras/:estado')
  salvar(
    @Param('id') id: string,
    @Param('estado') estado: string,
    @Body() body: any,
  ) {
    return this.regrasService.salvar(Number(id), estado.toUpperCase(), body);
  }
}
